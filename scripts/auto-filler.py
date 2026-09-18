#!/usr/bin/env python3
"""
Auto-fill and submit web forms with template data using Playwright.
Spawned by the panel's API endpoint, accepts targets (with pre-detected contact URLs) and template data.
Requires: beautifulsoup4, playwright (run: npm run setup:python once)
"""

import sys
import json
import asyncio
import re
from urllib.parse import urljoin, urlparse
import logging
import signal
import time
import urllib.request
import urllib.error
from dataclasses import dataclass, asdict

# Handle broken pipe errors gracefully (Unix/Linux only)
if hasattr(signal, 'SIGPIPE'):
    signal.signal(signal.SIGPIPE, signal.SIG_DFL)

def safe_print(data):
    """Print JSON safely, catching pipe errors."""
    try:
        print(data, flush=True)
        sys.stdout.flush()
    except BrokenPipeError:
        # Connection closed, exit gracefully
        logger.error("Broken pipe - connection closed by server")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error printing output: {e}")
        sys.exit(1)
import signal
import os

# Handle broken pipe errors gracefully
signal.signal(signal.SIGPIPE, signal.SIG_DFL) if hasattr(signal, 'SIGPIPE') else None

# Check dependencies upfront and fail with an actionable message.
try:
    from bs4 import BeautifulSoup
    from playwright.async_api import async_playwright
except ImportError as error:
    missing = getattr(error, "name", None) or "Python package"
    print(f"Missing auto-fill dependency: {missing}. Run: npm run setup:python", file=sys.stderr)
    sys.exit(2)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Read JSON from stdin so large batches do not exceed the operating system's
# command-line length limit. Keep argv support for older launchers.
raw_config = sys.argv[1] if len(sys.argv) >= 2 else sys.stdin.read()
if not raw_config.strip():
    logger.error("No JSON config received on stdin or argv")
    sys.exit(1)

try:
    config = json.loads(raw_config)
except json.JSONDecodeError as e:
    logger.error(f"Invalid JSON config: {e}")
    sys.exit(1)

domains = config.get("targets", [])
template = config.get("template", {})
max_workers = config.get("workers", 3)
captcha_api_key = os.environ.get("HIVOLT_CAPTCHA_API_KEY", "") or config.get("captchaApiKey", "")
enable_captcha_solver = config.get("enableCaptchaSolver", False) and bool(captcha_api_key)
grok_api_key = os.environ.get("HIVOLT_GROK_API_KEY", "") or config.get("grokApiKey", "")
enable_grok_mapping = config.get("enableGrokMapping", False) and bool(grok_api_key)
gemini_api_key = os.environ.get("HIVOLT_GEMINI_API_KEY", "") or config.get("geminiApiKey", "")
enable_gemini_mapping = config.get("enableGeminiMapping", False) and bool(gemini_api_key)

# Extract template fields
from_email = template.get("fromEmail", "")
business_email = template.get("businessEmail", "") or from_email
from_name = template.get("fromName", "")
first_name = template.get("firstName", "")
last_name = template.get("lastName", "")
reply_to = template.get("replyTo", from_email)
subject = template.get("subject", "")
message = template.get("message", "")
phone = template.get("phone", "")
company = template.get("company", "")
job_title = template.get("jobTitle", "")
employee_count = template.get("employeeCount", "")
company_industry = template.get("companyIndustry", "")
discovery_source = template.get("discoverySource", "")
street_address = template.get("streetAddress", "")
city = template.get("city", "")
state = template.get("state", "")
postal_code = template.get("postalCode", "")
country = template.get("country", "")

profile_values = {
    "full_name": from_name or f"{first_name} {last_name}".strip(),
    "first_name": first_name,
    "last_name": last_name,
    "business_email": business_email,
    "phone": phone,
    "company": company,
    "job_title": job_title,
    "employee_count": employee_count,
    "company_industry": company_industry,
    "discovery_source": discovery_source,
    "street_address": street_address,
    "city": city,
    "state": state,
    "postal_code": postal_code,
    "country": country,
    "full_address": ", ".join(part for part in [street_address, city, state, postal_code, country] if part),
    "subject": subject,
    "message": BeautifulSoup(message, "html.parser").get_text("\n", strip=True),
}

logger.info(f"Starting auto-fill for {len(domains)} targets with {max_workers} workers")
logger.info(f"From: {from_name} <{from_email}>")
if enable_captcha_solver:
    logger.info(f"CAPTCHA solving enabled via 2captcha")
if enable_grok_mapping:
    logger.info("Grok semantic field mapping enabled (primary)")
if enable_gemini_mapping:
    logger.info("Gemini semantic field mapping enabled (fallback)")

results = {
    "submitted": [],
    "failed": [],
    "skipped": [],
}

gemini_model_name = None
gemini_model_candidates = None
gemini_api_version = None
grok_model_name = None


def field_mapping_prompt(fields):
    """Build the provider-neutral field-mapping prompt."""
    allowed_keys = [key for key, value in profile_values.items() if value]
    return allowed_keys, {
        "task": "Map each web form field index to exactly one profile key, or null when uncertain.",
        "rules": [
            "Return only a JSON object whose keys are field indexes as strings.",
            "Values must be one of allowed_profile_keys or null.",
            "Use semantic meaning from label, name, id, placeholder, autocomplete, and type.",
            "Do not map search, login, password, coupon, upload, hidden, submit, or CAPTCHA fields.",
            "Distinguish first_name, last_name, and full_name.",
            "Use business_email for email fields and message for inquiry/comment/project-detail fields.",
        ],
        "allowed_profile_keys": allowed_keys,
        "fields": fields,
    }


def parse_field_mapping(text, allowed_keys):
    """Parse and constrain a provider response to local profile keys."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    mapping = json.loads(text)
    if not isinstance(mapping, dict):
        return {}
    return {
        str(index): profile_key
        for index, profile_key in mapping.items()
        if isinstance(profile_key, str) and profile_key in allowed_keys
    }


def discover_grok_model():
    """Return an available Grok model suitable for field mapping."""
    global grok_model_name
    if grok_model_name:
        return grok_model_name
    request = urllib.request.Request(
        "https://api.x.ai/v1/models",
        headers={"Authorization": f"Bearer {grok_api_key}"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))
    available = [model.get("id", "") for model in payload.get("data", [])]
    preferred = ["grok-4-fast-non-reasoning", "grok-4-fast", "grok-3-mini", "grok-3"]
    grok_model_name = next(
        (name for name in preferred if name in available),
        next((name for name in available if name.startswith("grok")), None),
    )
    if not grok_model_name:
        raise RuntimeError("No Grok model is available for this xAI API key")
    return grok_model_name


def request_grok_json(prompt):
    """Send a constrained JSON request to xAI and return the decoded object."""
    model_name = discover_grok_model()
    payload = json.dumps({
        "model": model_name,
        "messages": [{"role": "user", "content": json.dumps(prompt)}],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }).encode("utf-8")
    request = urllib.request.Request(
        "https://api.x.ai/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {grok_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        result = json.loads(response.read().decode("utf-8"))
    logger.info(f"  Grok model selected: {model_name}")
    content = result["choices"][0]["message"]["content"].strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    decoded = json.loads(content)
    if not isinstance(decoded, dict):
        raise ValueError("Grok response was not a JSON object")
    return decoded


def request_grok_field_map(fields):
    """Request field mappings from xAI's OpenAI-compatible API."""
    allowed_keys, prompt = field_mapping_prompt(fields)
    return parse_field_mapping(json.dumps(request_grok_json(prompt)), allowed_keys)


def request_grok_interaction_plan(controls):
    """Choose only valid, present form controls needed for a business inquiry."""
    prompt = {
        "task": "Choose form interactions needed to reveal or complete a general business inquiry form.",
        "rules": [
            "Return only {\"selections\": [{\"index\": number, \"value\": string}]}.",
            "Use only indexes and exact option values present in controls.",
            "Choose at most one value per radio group or select.",
            "Prefer general inquiry, sales, quote, business, other, or no-preference choices.",
            "Check a checkbox only when it is required consent needed to submit.",
            "Click a button only when it reveals inquiry fields; never click submit, send, next, continue, reset, login, subscribe, or destructive controls.",
            "Omit optional marketing, mailing-list, employment, support, investor, and media choices unless the inquiry context requires them.",
        ],
        "inquiry_context": {
            "subject": subject,
            "company": company,
            "employee_count": employee_count,
            "company_industry": company_industry,
            "discovery_source": discovery_source,
            "country": country,
            "message": profile_values["message"][:500],
        },
        "controls": controls,
    }
    response = request_grok_json(prompt)
    selections = response.get("selections", [])
    if not isinstance(selections, list):
        return []
    valid = []
    selected_indexes = set()
    selected_radio_groups = set()
    by_index = {control["index"]: control for control in controls}
    for selection in selections:
        if not isinstance(selection, dict) or not isinstance(selection.get("index"), int):
            continue
        control = by_index.get(selection["index"])
        value = selection.get("value")
        if not control or not isinstance(value, str):
            continue
        if control["index"] in selected_indexes:
            continue
        if control["kind"] == "radio" and control.get("name") in selected_radio_groups:
            continue
        if control["kind"] == "checkbox" and not control.get("required"):
            continue
        if control["kind"] == "button":
            button_text = " ".join([
                control.get("label", ""),
                control.get("name", ""),
                control.get("id", ""),
            ]).lower()
            blocked_actions = [
                "submit", "send", "next", "continue", "reset", "login", "sign in",
                "subscribe", "delete", "remove", "cancel", "purchase", "pay",
            ]
            if any(action in button_text for action in blocked_actions):
                continue
        allowed_values = [option["value"] for option in control.get("options", [])]
        if value in allowed_values:
            valid.append({"index": control["index"], "value": value})
            selected_indexes.add(control["index"])
            if control["kind"] == "radio" and control.get("name"):
                selected_radio_groups.add(control["name"])
    return valid


async def plan_form_interactions_with_grok(controls):
    """Run Grok interaction planning off the Playwright event loop."""
    if not enable_grok_mapping or not controls:
        return []
    try:
        logger.info(f"  Grok planning {len(controls)} selectable/clickable control(s)")
        plan = await asyncio.wait_for(
            asyncio.to_thread(request_grok_interaction_plan, controls),
            timeout=25,
        )
        logger.info(f"  Grok selected {len(plan)} safe interaction(s)")
        return plan
    except Exception as error:
        logger.warning(f"  Grok interaction planning unavailable: {type(error).__name__}: {str(error)[:120]}")
        return []


def describe_interaction_controls(form):
    """Serialize real form choices for constrained AI selection."""
    controls = []
    candidates = form.find_all(["select", "button", "input"])
    for dom_index, candidate in enumerate(candidates):
        input_type = candidate.get("type", "").lower()
        if candidate.name == "select":
            kind = "select"
            options = [
                {"value": option.get("value", ""), "label": option.get_text(" ", strip=True)}
                for option in candidate.find_all("option")
                if option.get("value", "") and not option.has_attr("disabled")
            ]
        elif candidate.name == "input" and input_type in ["radio", "checkbox"]:
            kind = input_type
            options = [{"value": candidate.get("value", "on"), "label": ""}]
        elif candidate.name == "button" and input_type not in ["submit", "reset"]:
            kind = "button"
            options = [{"value": "click", "label": candidate.get_text(" ", strip=True)}]
        elif candidate.name == "input" and input_type == "button":
            kind = "button"
            options = [{"value": "click", "label": candidate.get("value", "") }]
        else:
            continue
        field_id = candidate.get("id", "")
        label = ""
        if field_id:
            label_node = form.find("label", {"for": field_id})
            if label_node:
                label = label_node.get_text(" ", strip=True)
        if not label and candidate.parent and candidate.parent.name == "label":
            label = candidate.parent.get_text(" ", strip=True)
        controls.append({
            "index": len(controls),
            "dom_index": dom_index,
            "kind": kind,
            "name": candidate.get("name", ""),
            "id": field_id,
            "label": label,
            "required": candidate.has_attr("required") or candidate.get("aria-required") == "true",
            "options": options,
        })
    return controls


async def safe_get_page_content(page, max_retries=3, wait_after_nav_ms=1000):
    """
    Safely get page content with retry logic for navigation errors.
    Handles: "Page.content: Unable to retrieve content because the page is navigating and changing the content."
    """
    for attempt in range(max_retries):
        try:
            # Add small delay to let page stabilize
            await page.wait_for_timeout(wait_after_nav_ms)
            return await page.content()
        except Exception as e:
            error_msg = str(e)
            if "navigating and changing the content" in error_msg:
                if attempt < max_retries - 1:
                    logger.debug(f"  Page navigation in progress, retrying ({attempt + 1}/{max_retries})...")
                    await page.wait_for_timeout(500 * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    raise
            else:
                raise
    return None


def discover_gemini_models():
    """Return generateContent-capable Gemini models available to this API key."""
    global gemini_model_candidates
    if gemini_model_candidates:
        return gemini_model_candidates

    request = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/models?pageSize=100",
        headers={"x-goog-api-key": gemini_api_key},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))

    supported = []
    for model in payload.get("models", []):
        methods = model.get("supportedGenerationMethods", [])
        name = model.get("name", "").removeprefix("models/")
        if name and "generateContent" in methods:
            supported.append(name)

    preferred = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"]
    ordered = [name for candidate in preferred for name in supported if name == candidate]
    ordered.extend(
        name for name in supported
        if "flash" in name and "preview" not in name and name not in ordered
    )
    if not ordered:
        raise RuntimeError("No Gemini model with generateContent access is available for this API key")
    gemini_model_candidates = ordered
    return gemini_model_candidates


def request_gemini_field_map(fields):
    """Request semantic field-to-profile-key mappings; values are resolved locally."""
    allowed_keys, prompt = field_mapping_prompt(fields)
    payload = json.dumps({
        "contents": [{"parts": [{"text": json.dumps(prompt)}]}],
        "generationConfig": {
            "temperature": 0,
            "responseMimeType": "application/json",
            "maxOutputTokens": 1024,
        },
    }).encode("utf-8")
    global gemini_model_name, gemini_api_version
    candidates = [gemini_model_name] if gemini_model_name else discover_gemini_models()
    result = None
    last_error = None
    for model_name in candidates:
        api_versions = [gemini_api_version] if gemini_api_version else ["v1beta", "v1"]
        for api_version in api_versions:
            request = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/{api_version}/models/{model_name}:generateContent",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": gemini_api_key,
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(request, timeout=20) as response:
                    result = json.loads(response.read().decode("utf-8"))
                gemini_model_name = model_name
                gemini_api_version = api_version
                logger.info(f"  Gemini model selected: {model_name} ({api_version})")
                break
            except urllib.error.HTTPError as error:
                error_body = error.read().decode("utf-8", errors="replace")[:200]
                last_error = RuntimeError(
                    f"{model_name} on {api_version} returned HTTP {error.code}: {error_body}"
                )
                if error.code not in [404, 400]:
                    raise last_error from error
        if result is not None:
            break
    if result is None:
        raise last_error or RuntimeError("No compatible Gemini generateContent endpoint was found")
    text = result["candidates"][0]["content"]["parts"][0]["text"]
    return parse_field_mapping(text, allowed_keys)


async def map_fields_with_ai(fields):
    """Try Grok first, then Gemini, without blocking the Playwright event loop."""
    if not fields or not (enable_grok_mapping or enable_gemini_mapping):
        return {}
    if enable_grok_mapping:
        try:
            logger.info(f"  Grok analyzing {len(fields)} unresolved field(s)")
            mapping = await asyncio.wait_for(asyncio.to_thread(request_grok_field_map, fields), timeout=25)
            logger.info(f"  Grok confidently mapped {len(mapping)} field(s)")
            if mapping:
                return mapping
        except Exception as error:
            logger.warning(f"  Grok mapping unavailable: {type(error).__name__}: {str(error)[:120]}")
    if enable_gemini_mapping:
        try:
            logger.info(f"  Gemini fallback analyzing {len(fields)} unresolved field(s)")
            mapping = await asyncio.wait_for(asyncio.to_thread(request_gemini_field_map, fields), timeout=25)
            logger.info(f"  Gemini confidently mapped {len(mapping)} field(s)")
            return mapping
        except Exception as error:
            logger.warning(f"  Gemini mapping unavailable: {type(error).__name__}: {str(error)[:120]}")
    return {}


async def detect_and_solve_captcha(page, api_key):
    """
    Detect and solve CAPTCHA on the page using 2Captcha.
    Supports reCAPTCHA v2, v3, Cloudflare Turnstile, and FunCaptcha.
    Returns True if CAPTCHA was detected and solved, False otherwise.
    """
    try:
        page_url = page.url
        sitekey = None
        captcha_type = None

        # Turnstile also uses data-sitekey, so detect it before generic reCAPTCHA.
        try:
            turnstile = await page.query_selector(
                '.cf-turnstile[data-sitekey], [data-sitekey^="0x"]'
            )
            if turnstile:
                sitekey = await turnstile.get_attribute('data-sitekey')
                if sitekey:
                    captcha_type = "turnstile"
                    logger.info(f"  🔒 Cloudflare Turnstile detected, sitekey: {sitekey[:10]}...")
        except Exception:
            pass

        # Method 1: Check for standard reCAPTCHA data-sitekey
        if not sitekey:
            try:
                recaptcha_elem = await page.query_selector('[data-sitekey]')
                if recaptcha_elem:
                    sitekey = await recaptcha_elem.get_attribute('data-sitekey')
                    captcha_type = "turnstile" if sitekey and sitekey.startswith("0x") else "recaptcha"
                    label = "Cloudflare Turnstile" if captcha_type == "turnstile" else "reCAPTCHA v2"
                    logger.info(f"  🔒 {label} detected, sitekey: {sitekey[:10]}...")
            except Exception:
                pass
        
        # Method 2: Check for g-recaptcha div (alternative)
        if not sitekey:
            try:
                g_recaptcha = await page.query_selector('.g-recaptcha[data-sitekey]')
                if g_recaptcha:
                    sitekey = await g_recaptcha.get_attribute('data-sitekey')
                    captcha_type = "recaptcha"
                    logger.info(f"  🔒 reCAPTCHA (g-recaptcha) detected, sitekey: {sitekey[:10]}...")
            except:
                pass
        
        # Method 3: Check for invisible reCAPTCHA
        if not sitekey:
            try:
                invisible = await page.query_selector('[data-size="invisible"][data-sitekey]')
                if invisible:
                    sitekey = await invisible.get_attribute('data-sitekey')
                    captcha_type = "recaptcha_v3"
                    logger.info(f"  🔒 Invisible reCAPTCHA v3 detected, sitekey: {sitekey[:10]}...")
            except:
                pass
        
        # Method 5: Check for FunCaptcha/Arkose Labs
        if not sitekey:
            try:
                funcaptcha = await page.query_selector('[data-pkey]')
                if funcaptcha:
                    sitekey = await funcaptcha.get_attribute('data-pkey')
                    captcha_type = "funcaptcha"
                    logger.info(f"  🔒 FunCaptcha detected, pkey: {sitekey[:10]}...")
            except:
                pass
        
        # If we found a CAPTCHA, try to solve it
        if sitekey and captcha_type and api_key:
            solved_challenges = getattr(page, "_hivolt_solved_captchas", set())
            attempted_challenges = getattr(page, "_hivolt_attempted_captchas", set())
            challenge_key = (captcha_type, sitekey, page_url)
            if challenge_key in solved_challenges:
                logger.info(f"  ✓ {captcha_type} already solved on this page")
                return True
            if challenge_key in attempted_challenges:
                logger.warning(f"  ⚠️ {captcha_type} was already attempted on this page; not charging again")
                return False
            attempted_challenges.add(challenge_key)
            setattr(page, "_hivolt_attempted_captchas", attempted_challenges)
            solved = await solve_captcha_2captcha(page, sitekey, page_url, captcha_type, api_key)
            if solved:
                solved_challenges.add(challenge_key)
                setattr(page, "_hivolt_solved_captchas", solved_challenges)
            return solved
        
        return False
        
    except Exception as e:
        logger.debug(f"  CAPTCHA detection error: {e}")
        return False


async def solve_captcha_2captcha(page, sitekey, page_url, captcha_type, api_key):
    """
    Solve CAPTCHA using 2captcha API.
    Injects the token directly into the page after solving.
    """
    try:
        import urllib.request
        import urllib.parse
        
        logger.info(f"  🔒 Solving {captcha_type} via 2captcha...")
        
        # Build the legacy API request with parameters specific to each CAPTCHA type.
        api_url = "https://2captcha.com/in.php"
        captcha_method = "userrecaptcha" if captcha_type in ["recaptcha", "recaptcha_v3"] else captcha_type
        request_data = {
            "key": api_key,
            "method": captcha_method,
            "pageurl": page_url,
            "json": 1
        }
        if captcha_type in ["recaptcha", "recaptcha_v3"]:
            request_data["googlekey"] = sitekey
        elif captcha_type == "turnstile":
            request_data["sitekey"] = sitekey
        elif captcha_type == "funcaptcha":
            request_data["publickey"] = sitekey
        post_data = urllib.parse.urlencode(request_data).encode()
        
        try:
            # Submit CAPTCHA
            submit_request = urllib.request.Request(
                api_url,
                data=post_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                method="POST",
            )
            with urllib.request.urlopen(submit_request, timeout=30) as response:
                result = json.loads(response.read().decode())
                if result.get("status") != 1:
                    error_message = result.get("error_text") or result.get("request") or "Unknown error"
                    logger.warning(f"  ⚠️ 2captcha error: {error_message}")
                    return False
                
                captcha_id = result.get("request")
                if not captcha_id:
                    logger.warning(f"  ⚠️ No captcha ID returned by 2captcha")
                    return False
                
                logger.info(f"  📤 CAPTCHA submitted to 2captcha (ID: {captcha_id})")
                
                # Poll for result (up to 60 seconds)
                for poll_attempt in range(12):
                    await asyncio.sleep(5)  # Wait 5 seconds between polls
                    
                    result_url = "https://2captcha.com/res.php?" + urllib.parse.urlencode({
                        "key": api_key,
                        "action": "get",
                        "id": captcha_id,
                        "json": 1,
                    })
                    try:
                        with urllib.request.urlopen(result_url, timeout=10) as resp:
                            result_data = json.loads(resp.read().decode())
                            
                            if result_data.get("status") == 1:
                                captcha_token = result_data.get("request")
                                logger.info(f"  ✓ CAPTCHA solved! Injecting token...")
                                
                                # Inject token into page based on CAPTCHA type
                                if captcha_type in ["recaptcha", "recaptcha_v3"]:
                                    await page.evaluate(f"""
                                        // Set the token in the response textarea
                                        const responseElement = document.getElementById('g-recaptcha-response');
                                        if (responseElement) {{
                                            responseElement.innerHTML = '{captcha_token}';
                                            responseElement.style.display = 'block';
                                        }}
                                        
                                        // Also try to set it in any other recaptcha response elements
                                        document.querySelectorAll('[name="g-recaptcha-response"]').forEach(el => {{
                                            el.value = '{captcha_token}';
                                        }});
                                        
                                        // Trigger the callback if it exists
                                        if (typeof ___grecaptcha_cfg !== 'undefined') {{
                                            Object.entries(___grecaptcha_cfg.clients).forEach(([key, client]) => {{
                                                if (client.callback) {{
                                                    client.callback('{captcha_token}');
                                                }}
                                            }});
                                        }}
                                    """)
                                elif captcha_type == "turnstile":
                                    await page.evaluate(f"""
                                        const turnstileResponse = document.querySelector('[name="cf-turnstile-response"]');
                                        if (turnstileResponse) {{
                                            turnstileResponse.value = '{captcha_token}';
                                        }}
                                        // Trigger turnstile callback if it exists
                                        if (window.turnstileCallback) {{
                                            window.turnstileCallback('{captcha_token}');
                                        }}
                                    """)
                                elif captcha_type == "funcaptcha":
                                    await page.evaluate(f"""
                                        const fcToken = document.querySelector('[name="fc-token"]');
                                        if (fcToken) {{
                                            fcToken.value = '{captcha_token}';
                                        }}
                                    """)
                                
                                logger.info(f"  ✓ CAPTCHA token injected successfully!")
                                return True
                    except:
                        if poll_attempt < 11:
                            logger.debug(f"  ⏳ Waiting for CAPTCHA solution... ({poll_attempt + 1}/12)")
                            continue
                
                logger.warning(f"  ⏱️ CAPTCHA solving timeout after 60s")
                return False
        
        except Exception as e:
            logger.warning(f"  ⚠️ 2captcha API error: {str(e)[:100]}")
            return False
        
        return False
    
    except Exception as e:
        logger.debug(f"  CAPTCHA injection error: {e}")
        return False


def is_real_contact_form(form):
    """Check if a form looks like a real contact form, not a search/login form."""
    all_inputs = form.find_all(["input", "textarea", "select"])
    
    # Must have at least 1 field (very permissive)
    if len(all_inputs) < 1:
        return False
    
    # Skip pure search/filter/login forms
    field_names = [inp.get("name", "").lower() for inp in all_inputs if inp.get("name")]
    
    # If it's ONLY obvious non-contact fields, skip it
    non_contact_only_fields = ["s", "q", "search", "filter", "username", "password", "login", "signin"]
    if field_names and all(n in non_contact_only_fields for n in field_names):
        return False
    
    # Check for contact-related keywords (expanded list)
    contact_keywords = [
        "email", "mail", "e-mail", "message", "comment", "inquiry", "question",
        "name", "phone", "tel", "mobile", "cell", "subject", "contact", "feedback",
        "request", "form", "description", "details", "company", "business",
        "firstname", "lastname", "fullname", "first-name", "last-name",
        "visitor", "customer", "your", "comments", "inquiry", "inquiry",
        "content", "body", "msg", "text", "note", "remarks"
    ]
    
    # Check field names, placeholders, labels, and types
    for inp in all_inputs:
        if inp.get("type") == "hidden":
            continue
        
        name_lower = inp.get("name", "").lower()
        type_lower = inp.get("type", "").lower()
        placeholder_lower = inp.get("placeholder", "").lower()
        value_lower = inp.get("value", "").lower()
        
        # Any textarea is probably a contact form
        if inp.name == "textarea":
            return True
        
        # Email type input is contact form
        if type_lower == "email":
            return True
        
        # Check name attribute for keywords
        if any(kw in name_lower for kw in contact_keywords):
            return True
        
        # Check placeholder
        if any(kw in placeholder_lower for kw in contact_keywords):
            return True
        
        # Check value for keywords
        if any(kw in value_lower for kw in contact_keywords):
            return True
        
        # Check associated label
        field_id = inp.get("id", "")
        if field_id:
            label = form.find("label", {"for": field_id})
            if label:
                label_text = label.get_text(strip=True).lower()
                if any(kw in label_text for kw in contact_keywords):
                    return True
    
    # Default: if has 2+ text-like fields (not password/hidden), likely contact form
    # This catches forms with non-standard field names
    text_like = [i for i in all_inputs if i.get("type") in ["text", "email", "tel", "number", "url", ""]]
    textareas = [i for i in all_inputs if i.name == "textarea"]
    
    # 2+ text fields, or 1+ textarea, or 1+ email field = contact form
    if len(text_like) >= 2 or textareas or any(i.get("type") == "email" for i in all_inputs):
        return True
    
    return False


def is_search_field(inp):
    """Identify search/filter controls that must never receive outreach profile data."""
    field_type = inp.get("type", "").lower()
    metadata = " ".join([
        inp.get("name", ""),
        inp.get("id", ""),
        inp.get("placeholder", ""),
        inp.get("aria-label", ""),
        inp.get("role", ""),
    ]).lower()
    tokens = set(re.findall(r"[a-z0-9]+", metadata))
    return field_type == "search" or bool(tokens.intersection({"search", "filter"})) or tokens in ({"s"}, {"q"})


REACHOUT_TERMS = (
    "contact", "reach out", "reach us", "get in touch", "inquiry", "enquiry",
    "enquire", "get quote", "get a quote", "request quote", "free quote",
    "estimate", "pricing", "request information", "talk to sales", "contact sales",
    "speak with", "talk to an expert", "consultation", "book a demo", "schedule a demo",
    "get started", "send message", "ask a question", "start a project", "work with us",
    "request proposal", "rfq", "lets talk", "let's talk",
)

TRUSTED_EXTERNAL_FORM_HOSTS = (
    "jotform.com", "typeform.com", "hubspot.com", "hsforms.com", "formstack.com",
    "wufoo.com", "pardot.com", "marketo.com", "clearervision.co", "office.com",
)


def is_trusted_external_form_host(host):
    normalized = (host or "").lower().removeprefix("www.")
    return any(normalized == trusted or normalized.endswith(f".{trusted}") for trusted in TRUSTED_EXTERNAL_FORM_HOSTS)


def is_allowed_contact_url(domain, contact_url):
    """Reject unrelated tracking/social URLs while allowing the site and known form providers."""
    target_host = (urlparse(domain if "://" in domain else f"https://{domain}").hostname or "").lower()
    contact_host = (urlparse(contact_url).hostname or "").lower()
    target_root = target_host.removeprefix("www.")
    contact_root = contact_host.removeprefix("www.")
    return (
        not contact_host
        or contact_root == target_root
        or contact_root.endswith(f".{target_root}")
        or is_trusted_external_form_host(contact_root)
    )


def find_contact_form(soup):
    """Return the first contact-like form instead of assuming the first form is relevant."""
    for candidate in soup.find_all("form"):
        if is_real_contact_form(candidate):
            return candidate
    return None


def extract_reachout_urls(soup, current_url, limit=16):
    """Collect same-site links whose text, URL, title, or aria-label signals outreach intent."""
    current_host = urlparse(current_url).hostname or ""
    ranked = []
    seen = set()
    for anchor in soup.find_all("a", href=True):
        href = anchor.get("href", "").strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        text = " ".join(anchor.stripped_strings).lower()
        metadata = " ".join([
            text,
            href.lower().replace("-", " ").replace("_", " "),
            anchor.get("title", "").lower(),
            anchor.get("aria-label", "").lower(),
        ])
        matches = sum(term in metadata for term in REACHOUT_TERMS)
        if not matches:
            continue
        absolute = urljoin(current_url, href)
        parsed = urlparse(absolute)
        if parsed.scheme not in ("http", "https"):
            continue
        if current_host and parsed.hostname and not (
            parsed.hostname == current_host or parsed.hostname.endswith(f".{current_host}")
        ):
            continue
        normalized = absolute.split("#", 1)[0]
        if normalized in seen:
            continue
        seen.add(normalized)
        ranked.append((matches, normalized))
    ranked.sort(key=lambda item: item[0], reverse=True)
    return [url for _, url in ranked[:limit]]


def extract_embedded_form_urls(soup, current_url, limit=8):
    """Find iframe-hosted forms commonly used for contact, quote, and sales inquiries."""
    form_markers = (
        "form", "contact", "inquiry", "enquiry", "quote", "estimate", "lead",
        "hubspot", "jotform", "typeform", "pardot", "marketo", "formstack", "wufoo",
    )
    urls = []
    seen = set()
    for frame in soup.find_all("iframe", src=True):
        src = frame.get("src", "").strip()
        metadata = " ".join([
            src.lower(),
            frame.get("title", "").lower(),
            frame.get("name", "").lower(),
            frame.get("id", "").lower(),
        ])
        if not any(marker in metadata for marker in form_markers):
            continue
        absolute = urljoin(current_url, src)
        if urlparse(absolute).scheme not in ("http", "https") or absolute in seen:
            continue
        seen.add(absolute)
        urls.append(absolute)
    return urls[:limit]


async def reveal_reachout_form(page):
    """Click one outreach CTA that may reveal a modal or dynamically injected form."""
    controls = await page.query_selector_all('button, [role="button"], input[type="button"]')
    for control in controls[:60]:
        try:
            text = " ".join(filter(None, [
                await control.text_content(),
                await control.get_attribute("value"),
                await control.get_attribute("aria-label"),
                await control.get_attribute("title"),
            ])).strip().lower()
            if not text or not any(term in text for term in REACHOUT_TERMS):
                continue
            if not await control.is_visible() or not await control.is_enabled():
                continue
            await control.click(timeout=2000)
            logger.info(f"  Clicked reach-out CTA: {text[:80]}")
            await page.wait_for_timeout(750)
            page_html = await safe_get_page_content(page, max_retries=2, wait_after_nav_ms=250)
            return find_contact_form(BeautifulSoup(page_html, "html.parser"))
        except Exception:
            continue
    return None


async def fill_and_submit(target, page):
    """Fill and submit form using Playwright (real browser automation)."""
    start_time = time.time()  # Track total time for this domain
    timing = {}  # Store detailed timing info
    
    try:
        # Handle both target dicts (new) and domain strings (legacy)
        if isinstance(target, str):
            domain = target
            contact_url = None
        else:
            domain = target.get("domain", "")
            contact_url = target.get("contactUrl")
        
        url = domain if domain.startswith(("http://", "https://")) else f"https://{domain}"
        
        # Try pre-detected contact URL first, then fall back to discovery
        fetch_url = None
        form_found = False
        
        # List of URLs to try (pre-detected first, then discovery)
        urls_to_try = []
        if contact_url:
            contact_url_full = contact_url if contact_url.startswith(("http://", "https://")) else f"https://{contact_url}"
            if is_allowed_contact_url(domain, contact_url_full):
                urls_to_try.append(("detected", contact_url_full))
            else:
                logger.warning(f"  [{domain}] Ignoring unrelated pre-detected contact URL: {contact_url_full}")
        
        # Add discovery paths (prioritized - most likely first to fail fast)
        discovery_paths = [
            "",  # Home page first so its real reach-out links can drive discovery.
            "/contact",
            "/contact-us",
            "/get-in-touch",
            "/inquiry",
            "/enquiry",
            "/get-a-quote",
            "/request-a-quote",
            "/free-quote",
            "/request-estimate",
            "/contact-sales",
            "/talk-to-sales",
            "/book-a-demo",
            "/consultation",
            "/support",
        ]
        for path in discovery_paths:
            urls_to_try.append(("discovery", urljoin(url, path)))
        
        # Also try common subdomain variations (but only if main domain form not found yet)
        subdomain_urls = []
        if "://" in url:
            proto, rest = url.split("://", 1)
            if "." in rest:
                domain_only = rest.split("/", 1)[0]
                for subdomain in ["fr", "de", "es", "it", "nl", "en"]:
                    if not domain_only.startswith(subdomain + "."):
                        subdomain_url = f"{proto}://{subdomain}.{domain_only}"
                        subdomain_urls.append(("subdomain", subdomain_url + "/contact"))
                        subdomain_urls.append(("subdomain", subdomain_url + "/contact-us"))
        
        # Try each URL with Playwright (reduced timeout for faster batch processing)
        discovery_start = time.time()
        queued_urls = {candidate_url for _, candidate_url in urls_to_try}
        while urls_to_try:
            source, try_url = urls_to_try.pop(0)
            page_load_start = time.time()
            try:
                await page.goto(try_url, timeout=5000, wait_until="domcontentloaded")
                page_load_time = time.time() - page_load_start
                
                # Check if there's a real contact form
                parse_start = time.time()
                page_html = await safe_get_page_content(page)
                soup = BeautifulSoup(page_html, "html.parser")
                form = find_contact_form(soup)
                parse_time = time.time() - parse_start
                
                if form:
                    fetch_url = try_url
                    form_found = True
                    source_label = "pre-detected" if source == "detected" else "discovered"
                    logger.info(f"✓ Found contact form ({source_label}): {fetch_url}")
                    logger.debug(f"  Page load: {page_load_time:.2f}s, Parse: {parse_time:.2f}s")
                    timing["form_discovery"] = time.time() - discovery_start
                    break
                else:
                    revealed_form = await reveal_reachout_form(page)
                    if revealed_form:
                        form = revealed_form
                        fetch_url = page.url
                        form_found = True
                        logger.info(f"✓ Found contact form after clicking reach-out CTA: {fetch_url}")
                        timing["form_discovery"] = time.time() - discovery_start
                        break
                    discovered_urls = extract_reachout_urls(soup, page.url)
                    embedded_urls = extract_embedded_form_urls(soup, page.url)
                    new_urls = [
                        candidate
                        for candidate in [*discovered_urls, *embedded_urls]
                        if candidate not in queued_urls
                    ]
                    if new_urls:
                        logger.info(f"  [{domain}] Found {len(new_urls)} reach-out or embedded form link(s) on {page.url}")
                        for candidate in new_urls:
                            queued_urls.add(candidate)
                        urls_to_try[0:0] = [("page-link", candidate) for candidate in new_urls]
                    logger.debug(f"  No real contact form at {try_url}, trying next... (load: {page_load_time:.2f}s)")
                    continue
            except Exception as e:
                page_load_time = time.time() - page_load_start
                logger.info(f"  [{domain}] Could not inspect {try_url}: {type(e).__name__} (after {page_load_time:.2f}s)")
                continue
        
        # If not found on main paths, try subdomains (only if not already found)
        if not form_found:
            for source, try_url in subdomain_urls:
                page_load_start = time.time()
                try:
                    await page.goto(try_url, timeout=3000, wait_until="networkidle")
                    page_load_time = time.time() - page_load_start
                    page_html = await safe_get_page_content(page)
                    soup = BeautifulSoup(page_html, "html.parser")
                    form = find_contact_form(soup)
                    
                    if form:
                        fetch_url = try_url
                        form_found = True
                        logger.info(f"✓ Found contact form (subdomain): {fetch_url}")
                        logger.debug(f"  Page load: {page_load_time:.2f}s")
                        timing["form_discovery"] = time.time() - discovery_start
                        break
                except Exception as e:
                    page_load_time = time.time() - page_load_start
                    logger.debug(f"  Error accessing {try_url}: {e} (after {page_load_time:.2f}s)")
                    continue
        
        if not form_found:
            # Check if CAPTCHA is blocking access - try to solve it
            if enable_captcha_solver and captcha_api_key:
                logger.info(f"  → Checking for CAPTCHA protection...")
                try:
                    captcha_solved = await detect_and_solve_captcha(page, captcha_api_key)
                    if captcha_solved:
                        logger.info(f"  ✓ CAPTCHA solved, retrying form detection...")
                        await page.wait_for_timeout(2000)  # Wait for page to update after CAPTCHA
                        
                        # Retry form detection on current page
                        page_html = await safe_get_page_content(page)
                        soup = BeautifulSoup(page_html, "html.parser")
                        form = find_contact_form(soup)
                        if form:
                            form_found = True
                            fetch_url = page.url
                            logger.info(f"  ✓ Contact form appeared after CAPTCHA solve!")
                            timing["form_discovery"] = time.time() - discovery_start
                except Exception as e:
                    logger.warning(f"  CAPTCHA solving error: {e}")
            
            if not form_found:
                results["skipped"].append({
                    "domain": domain,
                    "reason": "No contact form found",
                    "timing_ms": round((time.time() - start_time) * 1000)
                })
                logger.warning(f"⊘ {domain}: No contact form found")
                return
        
        # We found a form - now prepare it (handle required interactions)
        page_html = await safe_get_page_content(page)
        soup = BeautifulSoup(page_html, "html.parser")
        form = find_contact_form(soup)
        
        # STEP 1: Handle form pre-flight interactions (radio buttons, selects, etc. that gate content)
        interactions_start = time.time()
        logger.info(f"  → Handling form interactions (radio buttons, selects, etc.)")
        
        # Dismiss common overlay/notification dialogs first
        try:
            # Try multiple strategies to dismiss common overlays
            dismiss_attempts = [
                # Button text patterns (try to click buttons with specific text)
                ("text=No thanks", "Chrome notification"),
                ("text=Close", "Dialog close button"),
                ("text=OK", "OK button"),
                ("text=Agree", "Agreement button"),
                ("text=Accept", "Accept button"),
            ]
            
            for selector_pattern, label in dismiss_attempts:
                try:
                    # Use Playwright's text selector
                    buttons = await page.query_selector_all(f"button")
                    for btn in buttons:
                        btn_text = await btn.text_content()
                        if btn_text and any(x in btn_text for x in ["No thanks", "Close", "OK", "Agree", "Accept"]):
                            try:
                                await btn.click(timeout=2000)
                                logger.debug(f"    Dismissed overlay: {label} ({btn_text})")
                                await page.wait_for_timeout(150)
                                break
                            except:
                                continue
                except:
                    pass
        except Exception as e:
            logger.debug(f"    No overlays to dismiss: {str(e)[:60]}")
        
        # Handle radio buttons that gate form fields (like "General Questions" on gstile.com)
        interaction_controls = describe_interaction_controls(form)
        interaction_plan = await plan_form_interactions_with_grok(interaction_controls)
        interactions_applied = 0
        form_index = soup.find_all("form").index(form)
        form_locator = page.locator("form").nth(form_index)
        controls_by_index = {control["index"]: control for control in interaction_controls}
        for selection in interaction_plan:
            control = controls_by_index.get(selection["index"])
            if not control:
                continue
            try:
                locator = form_locator.locator("select, button, input").nth(control["dom_index"])
                if not await locator.is_visible() or not await locator.is_enabled():
                    continue
                if control["kind"] == "select":
                    await locator.select_option(selection["value"], timeout=2000)
                elif control["kind"] in ["radio", "checkbox"]:
                    await locator.check(timeout=2000)
                elif control["kind"] == "button" and selection["value"] == "click":
                    await locator.click(timeout=2000)
                else:
                    continue
                interactions_applied += 1
                description = control["label"] or control["name"] or control["id"] or control["kind"]
                logger.info(f"    Grok chose {control['kind']}: {description[:80]}")
                await page.wait_for_timeout(200)
            except Exception as error:
                logger.debug(f"    Could not apply Grok interaction {control['index']}: {str(error)[:80]}")

        # Fall back to deterministic choices only when Grok did not choose any safe interaction.
        radio_groups = form.find_all("input", {"type": "radio"})
        if radio_groups and interactions_applied == 0:
            logger.debug(f"    Found {len(radio_groups)} radio buttons - selecting first unique group")
            # Group radio buttons by name
            radio_by_name = {}
            for radio in radio_groups:
                radio_name = radio.get("name", "")
                if radio_name not in radio_by_name:
                    radio_by_name[radio_name] = radio
            
            # Click the first radio button in the first group
            if radio_by_name:
                first_group_name = list(radio_by_name.keys())[0]
                first_radio = radio_by_name[first_group_name]
                radio_id = first_radio.get("id", "")
                radio_value = first_radio.get("value", "")
                
                if radio_id:
                    try:
                        # Click by ID
                        await page.click(f'input[type="radio"][id="{radio_id}"]', timeout=2000)
                        logger.debug(f"    Selected radio: {radio_id}")
                        await page.wait_for_timeout(100)
                    except Exception as e:
                        logger.debug(f"    Could not click radio {radio_id}: {str(e)[:60]}")
                elif radio_value:
                    try:
                        # Click by value if no ID
                        await page.click(f'input[type="radio"][value="{radio_value}"]', timeout=2000)
                        logger.debug(f"    Selected radio: {radio_value}")
                        await page.wait_for_timeout(100)
                    except Exception as e:
                        logger.debug(f"    Could not click radio {radio_value}: {str(e)[:60]}")
        
        # Handle select dropdowns that might gate content
        selects = form.find_all("select")
        for select in selects if interactions_applied == 0 else []:
            select_name = select.get("name", "")
            options = select.find_all("option")
            if options and len(options) > 1:
                # Select the second option (first is usually placeholder)
                second_opt = options[1]
                opt_value = second_opt.get("value", "")
                if opt_value:
                    try:
                        await page.select_option(f'select[name="{select_name}"]', opt_value, timeout=2000)
                        logger.debug(f"    Selected option in {select_name}")
                        await page.wait_for_timeout(100)
                    except Exception as e:
                        logger.debug(f"    Could not select {select_name}: {str(e)[:60]}")
        
        # Wait for any dynamically loaded form fields to appear
        await page.wait_for_timeout(200)
        
        timing["form_interactions"] = time.time() - interactions_start
        
        # Check for CAPTCHA after form interactions (some forms show CAPTCHA only after clicking fields)
        if enable_captcha_solver and captcha_api_key:
            logger.info(f"  → Checking for CAPTCHA after form interactions...")
            try:
                captcha_solved = await detect_and_solve_captcha(page, captcha_api_key)
                if captcha_solved:
                    logger.info(f"  ✓ CAPTCHA solved after interaction!")
                    await page.wait_for_timeout(1000)
            except Exception as e:
                logger.debug(f"  CAPTCHA check error: {e}")
        
        # Re-parse the form after interactions (fields may have appeared)
        page_html = await safe_get_page_content(page)
        soup = BeautifulSoup(page_html, "html.parser")
        form = find_contact_form(soup)
        
        def get_field_info(inp):
            """Extract field info from input element."""
            name = inp.get("name", "")
            inp_type = inp.get("type", "text").lower()
            placeholder = inp.get("placeholder", "").lower()
            
            # Try to find associated label
            field_id = inp.get("id", "")
            label_text = ""
            if field_id:
                label = form.find("label", {"for": field_id})
                if label:
                    label_text = label.get_text(strip=True).lower()
            
            return {
                "name": name,
                "type": inp_type,
                "placeholder": placeholder,
                "label": label_text,
                "elem": inp
            }

        all_inputs = form.find_all(["input", "textarea", "select"])
        
        # Filter to fillable fields (skip hidden, submit, button, etc.)
        fillable_inputs = []
        for inp in all_inputs:
            inp_type = inp.get("type", "").lower()
            if inp_type == "hidden" or inp_type in ["submit", "button", "reset", "image"] or is_search_field(inp):
                continue
            fillable_inputs.append(inp)
        
        logger.info(f"  Form has {len(fillable_inputs)} fillable fields")
        
        # If no fields found at all, that's suspicious - log the actual form structure
        if not fillable_inputs:
            logger.warning(f"  Form has no fillable inputs - form HTML: {str(form)[:300]}")
            results["skipped"].append({
                "domain": domain,
                "reason": "Form has no fillable inputs",
                "timing_ms": round((time.time() - start_time) * 1000),
                "timing_breakdown": {k: round(v * 1000) for k, v in timing.items()}
            })
            return
        
        # Helper to fill field with scroll+focus to reveal hidden fields
        async def try_fill_field(selector, value):
            """Try to fill a field, checking if it's visible and enabled first."""
            try:
                elem = await page.query_selector(selector)
                if not elem:
                    logger.debug(f"    Field not found: {selector}")
                    return False
                
                # Check if element is visible and enabled
                is_hidden = await elem.evaluate("el => el.offsetParent === null || el.style.display === 'none'")
                if is_hidden:
                    logger.debug(f"    Field is hidden, trying to scroll into view: {selector}")
                    await elem.scroll_into_view_if_needed()
                    await page.wait_for_timeout(50)  # Reduced from 100
                    is_hidden = await elem.evaluate("el => el.offsetParent === null || el.style.display === 'none'")
                    if is_hidden:
                        logger.debug(f"    Field still hidden after scroll: {selector}")
                        return False
                
                # Check if disabled
                is_disabled = await elem.evaluate("el => el.disabled || el.hasAttribute('disabled')")
                if is_disabled:
                    logger.debug(f"    Field is disabled: {selector}")
                    return False
                
                # Try to fill with shorter timeout
                await elem.focus()
                await elem.fill(value, timeout=2000)
                logger.debug(f"    Filled: {selector}")
                return True
            except Exception as e:
                logger.debug(f"    Could not fill {selector}: {str(e)[:80]}")
                return False
        
        # Fill form fields: try to be smart about matching, but fall back to just filling anything we can
        fill_start = time.time()
        fields_filled = {}
        
        # Strategy 1: Try to match fields by name/label/placeholder
        email_candidates = []
        full_name_candidates = []
        first_name_candidates = []
        last_name_candidates = []
        subject_candidates = []
        message_candidates = []
        
        for inp in fillable_inputs:
            name = inp.get("name", "")
            inp_type = inp.get("type", "").lower()
            placeholder = inp.get("placeholder", "").lower()
            field_id = inp.get("id", "")
            label_text = ""
            if field_id:
                label = form.find("label", {"for": field_id})
                if label:
                    label_text = label.get_text(strip=True).lower()
            
            # Categorize by pattern matching
            is_email = (inp_type == "email" or 
                       any(x in name.lower() or x in label_text or x in placeholder for x in ["email", "mail", "e-mail"]))
            is_message = (inp.name == "textarea" or 
                         any(x in name.lower() or x in label_text or x in placeholder for x in ["message", "comment", "inquiry", "request", "question", "details", "description", "body", "content"]))
            field_text = " ".join([name.lower(), label_text, placeholder])
            normalized_field = re.sub(r"[^a-z0-9]+", "_", field_text).strip("_")
            field_tokens = set(normalized_field.split("_"))
            is_first_name = (
                any(x in normalized_field for x in ["first_name", "firstname", "given_name"])
                or "fname" in field_tokens
            )
            is_last_name = (
                any(x in normalized_field for x in ["last_name", "lastname", "surname", "family_name"])
                or "lname" in field_tokens
            )
            is_subject = "subject" in field_tokens or "topic" in field_tokens
            non_person_name_tokens = {
                "business", "company", "organization", "project", "job", "title",
                "product", "file", "domain", "website", "department", "subject", "topic",
            }
            is_full_name = (
                not is_first_name
                and not is_last_name
                and not field_tokens.intersection(non_person_name_tokens)
                and (
                    any(x in normalized_field for x in ["full_name", "fullname", "your_name", "contact_name"])
                    or field_tokens == {"name"}
                )
            )
            
            if is_email:
                email_candidates.append((name, inp))
            if is_message:
                message_candidates.append((name, inp))
            if is_first_name:
                first_name_candidates.append((name, inp))
            elif is_last_name:
                last_name_candidates.append((name, inp))
            elif is_full_name:
                full_name_candidates.append((name, inp))
            if is_subject:
                subject_candidates.append((name, inp))
        
        logger.info(
            f"  Found: {len(email_candidates)} email, {len(full_name_candidates)} full-name, "
            f"{len(first_name_candidates)} first-name, {len(last_name_candidates)} last-name, "
            f"{len(message_candidates)} message candidates"
        )
        
        # Try email field
        if email_candidates and business_email:
            for field_name, inp in email_candidates:
                if await try_fill_field(f'input[name="{field_name}"]', business_email):
                    fields_filled[field_name] = business_email
                    logger.info(f"  → {field_name} (email) = {business_email}")
                    break
        
        # Fill split names before generic/full-name fields.
        for candidates, value, label in [
            (first_name_candidates, first_name, "first name"),
            (last_name_candidates, last_name, "last name"),
            (full_name_candidates, from_name, "full name"),
        ]:
            if not value:
                continue
            for field_name, inp in candidates:
                if field_name not in fields_filled:
                    if await try_fill_field(f'input[name="{field_name}"]', value):
                        fields_filled[field_name] = value
                        logger.info(f"  → {field_name} ({label})")
                        break
        
        # Fill subject independently so a generic "name" label cannot claim it.
        if subject_candidates and subject:
            for field_name, inp in subject_candidates:
                if field_name not in fields_filled:
                    if await try_fill_field(f'input[name="{field_name}"], textarea[name="{field_name}"]', subject):
                        fields_filled[field_name] = subject
                        logger.info(f"  → {field_name} (subject)")
                        break

        # Try message field
        if message_candidates and message:
            for field_name, inp in message_candidates:
                if field_name not in fields_filled:
                    # Try textarea first, then input
                    if await try_fill_field(f'textarea[name="{field_name}"]', message):
                        fields_filled[field_name] = message
                        logger.info(f"  → {field_name} (message/textarea) = [message]")
                        break
                    elif await try_fill_field(f'input[name="{field_name}"]', message):
                        fields_filled[field_name] = message
                        logger.info(f"  → {field_name} (message/input) = [message]")
                        break
        
        # Strategy 2: Let Gemini map unresolved fields to an allowlisted profile key.
        if enable_grok_mapping or enable_gemini_mapping:
            unresolved_fields = []
            unresolved_inputs = []
            for inp in fillable_inputs:
                field_name = inp.get("name", "")
                field_id = inp.get("id", "")
                field_type = inp.get("type", "text").lower()
                identity = field_name or field_id
                if inp.name == "select" or not identity or identity in fields_filled or field_type in ["checkbox", "radio", "file", "password"]:
                    continue
                label_text = ""
                if field_id:
                    label = form.find("label", {"for": field_id})
                    if label:
                        label_text = label.get_text(" ", strip=True)
                unresolved_fields.append({
                    "index": len(unresolved_fields),
                    "name": field_name,
                    "id": field_id,
                    "type": field_type,
                    "label": label_text,
                    "placeholder": inp.get("placeholder", ""),
                    "autocomplete": inp.get("autocomplete", ""),
                })
                unresolved_inputs.append(inp)

            ai_mapping = await map_fields_with_ai(unresolved_fields)
            for index_text, profile_key in ai_mapping.items():
                try:
                    inp = unresolved_inputs[int(index_text)]
                except (ValueError, IndexError):
                    continue
                field_name = inp.get("name", "")
                field_id = inp.get("id", "")
                identity = field_name or field_id
                value = profile_values.get(profile_key, "")
                escaped_name = field_name.replace("\\", "\\\\").replace('"', '\\"')
                escaped_id = field_id.replace("\\", "\\\\").replace('"', '\\"')
                selector = f'[name="{escaped_name}"]' if field_name else f'[id="{escaped_id}"]'
                if value and await try_fill_field(selector, value):
                    fields_filled[identity] = value
                    logger.info(f"  → {identity} (AI: {profile_key})")

        # Strategy 3: If nothing matched, try a conservative positional fallback.
        # This handles non-standard form layouts
        if not fields_filled and fillable_inputs:
            logger.info(f"  Strategy 3: No matched fields, filling first 3 available fields")
            fields_to_fill = []
            
            # Collect first 3 fillable fields (any type)
            for inp in fillable_inputs[:3]:
                field_name = inp.get("name", "")
                if field_name:
                    fields_to_fill.append((field_name, inp.get("type", "").lower(), inp))
            
            # Fill them with whatever we have
            for i, (field_name, inp_type, inp) in enumerate(fields_to_fill):
                if i == 0 and business_email:  # First field gets email
                    if await try_fill_field(f'input[name="{field_name}"], textarea[name="{field_name}"]', business_email):
                        fields_filled[field_name] = business_email
                        logger.info(f"  → {field_name} (fallback 1) = {business_email}")
                elif i == 1 and from_name:  # Second field gets name
                    if await try_fill_field(f'input[name="{field_name}"], textarea[name="{field_name}"]', from_name):
                        fields_filled[field_name] = from_name
                        logger.info(f"  → {field_name} (fallback 2) = {from_name}")
                elif message:  # Rest get message
                    if await try_fill_field(f'textarea[name="{field_name}"], input[name="{field_name}"]', message):
                        fields_filled[field_name] = message
                        logger.info(f"  → {field_name} (fallback message) = [message]")
        
        if not fields_filled:
            timing["field_filling"] = time.time() - fill_start
            logger.warning(f"⊘ {domain}: Could not fill any fields after 3 strategies")
            results["skipped"].append({
                "domain": domain,
                "reason": "Could not fill form fields",
                "timing_ms": round((time.time() - start_time) * 1000),
                "timing_breakdown": {k: round(v * 1000) for k, v in timing.items()}
            })
            return
        
        timing["field_filling"] = time.time() - fill_start
        
        logger.warning(f"Fields filled: {list(fields_filled.keys())}")
        
        # Dismiss cookie/consent banners before clicking submit
        try:
            # Common cookie banner dismiss buttons
            dismiss_selectors = [
                "button:has-text('Accept')",
                "button:has-text('OK')",
                "button:has-text('Close')",
                "button:has-text('I accept')",
                "button:has-text('Agree')",
                "[class*='cookie'] button",
                "[class*='consent'] button",
                "[id*='cookie'] button",
                "[id*='consent'] button",
            ]
            for selector in dismiss_selectors:
                try:
                    btn = await page.query_selector(selector)
                    if btn:
                        await btn.click(timeout=2000)
                        await page.wait_for_timeout(200)
                        logger.debug(f"  Dismissed cookie banner with: {selector}")
                        break
                except:
                    pass
        except Exception as e:
            logger.debug(f"  Could not dismiss cookie banner: {e}")
        
        # Check for CAPTCHA one more time before submit (some forms show it only at submission)
        if enable_captcha_solver and captcha_api_key:
            logger.info(f"  → Final CAPTCHA check before submit...")
            try:
                captcha_solved = await detect_and_solve_captcha(page, captcha_api_key)
                if captcha_solved:
                    logger.info(f"  ✓ CAPTCHA solved before submit!")
                    await page.wait_for_timeout(1000)
            except Exception as e:
                logger.debug(f"  Final CAPTCHA check error: {e}")
        
        # Find the submit control belonging to the form whose fields were filled.
        submit_button = None
        submit_candidates = await page.query_selector_all(
            "form button[type='submit'], form input[type='submit'], form button, form [role='button']"
        )
        best_score = -1
        filled_identities = list(fields_filled.keys())
        for candidate in submit_candidates:
            try:
                score = await candidate.evaluate(
                    """(element, identities) => {
                        const form = element.form || element.closest('form');
                        if (!form) return -1;
                        const controls = Array.from(form.querySelectorAll('input, textarea, select'));
                        return controls.filter((control) =>
                            identities.includes(control.name) || identities.includes(control.id)
                        ).length;
                    }""",
                    filled_identities,
                )
                if score > best_score:
                    best_score = score
                    submit_button = candidate
            except Exception:
                continue
        
        # If still not found, log what's actually in the form for debugging
        if not submit_button:
            try:
                buttons = await page.query_selector_all("form button, form input[type='button'], form input[type='submit'], form [role='button']")
                logger.warning(f"⊘ {domain}: No clickable submit button found ({len(buttons)} buttons in form)")
                if buttons:
                    for i, btn in enumerate(buttons[:3]):
                        tag = await btn.evaluate("el => el.tagName")
                        text = await btn.evaluate("el => el.textContent || el.value || ''")
                        btn_type = await btn.evaluate("el => el.getAttribute('type') || el.getAttribute('role') || ''")
                        logger.warning(f"  Button {i}: <{tag} type={btn_type}> text='{text}'")
            except:
                pass
        
        if submit_button:
            submit_start = time.time()
            try:
                async def visible_validation_messages():
                    messages = set()
                    nodes = await page.locator(
                        '[role="alert"], [aria-live="assertive"], .validation-error, .field-error, .form-error'
                    ).all()
                    for node in nodes:
                        try:
                            if await node.is_visible():
                                text = (await node.inner_text()).strip()
                                if text:
                                    messages.add(text)
                        except Exception:
                            continue
                    return messages

                before_url = page.url
                before_form_count = await page.locator("form").count()
                before_page_text = (await page.locator("body").inner_text(timeout=3000)).lower()
                before_error_texts = await visible_validation_messages()
                form_action = await submit_button.evaluate(
                    """(element) => {
                        const form = element.form || element.closest('form');
                        return form ? (form.action || location.href) : location.href;
                    }"""
                )
                submission_hosts = {
                    host for host in [urlparse(form_action).hostname, urlparse(before_url).hostname] if host
                }
                successful_submit_responses = []
                navigation_observed = False

                def record_navigation(frame):
                    nonlocal navigation_observed
                    try:
                        if frame == page.main_frame:
                            navigation_observed = True
                    except Exception:
                        pass

                def record_submit_response(response):
                    try:
                        response_host = urlparse(response.url).hostname
                        post_data = response.request.post_data or ""
                        carries_form_data = any(identity and identity in post_data for identity in filled_identities)
                        if (
                            response.request.method.upper() != "GET"
                            and 200 <= response.status < 400
                            and (
                                response_host in submission_hosts
                                or (is_trusted_external_form_host(response_host) and carries_form_data)
                            )
                            and response.request.resource_type in ["document", "xhr", "fetch"]
                        ):
                            successful_submit_responses.append(response.url)
                    except Exception:
                        pass

                page.on("response", record_submit_response)
                page.on("framenavigated", record_navigation)
                filled_before_submit = await submit_button.evaluate(
                    """(element, identities) => {
                        const form = element.form || element.closest('form');
                        if (!form) return 0;
                        return Array.from(form.querySelectorAll('input, textarea, select')).filter((control) =>
                            (identities.includes(control.name) || identities.includes(control.id))
                            && String(control.value || '').trim()
                        ).length;
                    }""",
                    filled_identities,
                )
                # Try to click submit with retries if element is blocked
                attempt = 0
                while attempt < 3:
                    try:
                        await submit_button.click(timeout=5000)
                        break
                    except Exception as click_err:
                        if "intercepts pointer" in str(click_err).lower():
                            # Try again if something is blocking (cookie banner, etc)
                            attempt += 1
                            await page.wait_for_timeout(500)
                        else:
                            raise
                
                # Wait for navigation or response
                try:
                    await page.wait_for_load_state("networkidle", timeout=10000)
                except:
                    pass

                await page.wait_for_timeout(1000)
                page.remove_listener("response", record_submit_response)
                page.remove_listener("framenavigated", record_navigation)
                try:
                    form_state = await submit_button.evaluate(
                        """(element, identities) => {
                            const form = element.form || element.closest('form');
                            if (!form || !form.isConnected) return { invalid: 0, filled: 0, connected: false };
                            const controls = Array.from(form.querySelectorAll('input, textarea, select'));
                            return {
                                invalid: controls.filter((control) => control.matches(':invalid')).length,
                                filled: controls.filter((control) =>
                                    (identities.includes(control.name) || identities.includes(control.id))
                                    && String(control.value || '').trim()
                                ).length,
                                connected: true,
                            };
                        }""",
                        filled_identities,
                    )
                except Exception:
                    form_state = {"invalid": 0, "filled": 0, "connected": False}
                invalid_fields = form_state["invalid"]
                page_text = (await page.locator("body").inner_text(timeout=3000)).lower()
                success_markers = [
                    "thank you", "thanks for contacting", "message sent", "successfully submitted",
                    "submission received", "we have received", "request received", "form submitted",
                    "we'll be back in touch", "we’ll be back in touch", "we will be in touch",
                ]
                after_form_count = await page.locator("form").count()
                new_success_marker = any(
                    marker in page_text and marker not in before_page_text
                    for marker in success_markers
                )
                visible_error_texts = await visible_validation_messages()
                new_error_texts = visible_error_texts - before_error_texts
                form_reset = filled_before_submit > 0 and form_state["filled"] == 0
                submission_confirmed = (
                    page.url != before_url
                    or navigation_observed
                    or after_form_count < before_form_count
                    or new_success_marker
                    or not form_state["connected"]
                    or form_reset
                    or bool(successful_submit_responses)
                )

                # Success wins when a form library renders confirmation inside an alert container.
                if submission_confirmed:
                    timing["submit"] = time.time() - submit_start
                    logger.warning(f"✓ SUBMITTED {domain} (confirmed)")
                    results["submitted"].append({
                        "domain": domain,
                        "form_url": fetch_url,
                        "timing_ms": round((time.time() - start_time) * 1000),
                        "timing_breakdown": {k: round(v * 1000) for k, v in timing.items()}
                    })
                    return

                if invalid_fields or new_error_texts:
                    error_detail = next(iter(new_error_texts), "required fields remain")[:120]
                    reason = f"Form validation blocked submission ({invalid_fields} invalid field(s)): {error_detail}"
                    logger.warning(f"✗ {domain}: {reason}")
                    timing["submit"] = time.time() - submit_start
                    results["failed"].append({
                        "domain": domain,
                        "reason": reason,
                        "timing_ms": round((time.time() - start_time) * 1000),
                        "timing_breakdown": {k: round(v * 1000) for k, v in timing.items()}
                    })
                    return

                if not submission_confirmed:
                    reason = "Submit clicked but no success confirmation was detected"
                    logger.warning(f"✗ {domain}: {reason}")
                    timing["submit"] = time.time() - submit_start
                    results["failed"].append({
                        "domain": domain,
                        "reason": reason,
                        "timing_ms": round((time.time() - start_time) * 1000),
                        "timing_breakdown": {k: round(v * 1000) for k, v in timing.items()}
                    })
                    return
                
            except Exception as e:
                timing["submit"] = time.time() - submit_start
                err_str = str(e)
                # Only log timeouts at warning level, others at error
                if "Timeout" in err_str or "intercepts" in err_str:
                    logger.warning(f"✗ {domain}: Submit blocked/timeout - field may be hidden or banner blocking click")
                    results["failed"].append({
                        "domain": domain,
                        "reason": "Submit button blocked by overlay (likely cookie banner)",
                        "timing_ms": round((time.time() - start_time) * 1000),
                        "timing_breakdown": {k: round(v * 1000) for k, v in timing.items()}
                    })
                else:
                    logger.warning(f"✗ {domain}: Submit failed - {err_str[:100]}")
                    results["failed"].append({
                        "domain": domain,
                        "reason": f"Submit error: {err_str[:100]}",
                        "timing_ms": round((time.time() - start_time) * 1000),
                        "timing_breakdown": {k: round(v * 1000) for k, v in timing.items()}
                    })
        else:
            timing["submit"] = 0  # Never reached submit
            logger.warning(f"✗ {domain}: No submit button found")
            results["failed"].append({
                "domain": domain,
                "reason": "No submit button found",
                "timing_ms": round((time.time() - start_time) * 1000),
                "timing_breakdown": {k: round(v * 1000) for k, v in timing.items()}
            })
    
    except Exception as e:
        results["failed"].append({
            "domain": domain if 'domain' in locals() else "unknown",
            "reason": f"Error: {str(e)}",
            "timing_ms": round((time.time() - start_time) * 1000),
            "timing_breakdown": {k: round(v * 1000) for k, v in timing.items()} if timing else {}
        })
        logger.error(f"Error processing {domain if 'domain' in locals() else 'unknown'}: {e}")


async def main():
    """Main entry point - process all targets with Playwright."""
    global results  # Allow signal handlers to access results
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            
            # Track progress for reporting
            processed = 0
            
            # CRITICAL: Reduce concurrency to prevent browser context saturation
            # 10 concurrent workers with shared context causes timeout cascades
            # Use 3 workers to keep page loads responsive
            effective_workers = min(3, max_workers)
            domain_timeout = 120 if enable_grok_mapping or enable_gemini_mapping else 90
            semaphore = asyncio.Semaphore(effective_workers)
            
            async def bounded_fill(target):
                nonlocal processed
                async with semaphore:
                    domain = target if isinstance(target, str) else target.get("domain", "unknown")
                    domain_started = time.time()
                    context = None
                    page = None
                    logger.info("=" * 60)
                    logger.info(f"PROCESSING: {domain}")
                    logger.info(f"[{domain}] Creating isolated browser context")
                    try:
                        # Include browser setup in the operation timeout so it cannot stall a worker forever.
                        context = await asyncio.wait_for(browser.new_context(), timeout=10)
                        page = await asyncio.wait_for(context.new_page(), timeout=10)
                        logger.info(f"[{domain}] Browser context ready")
                        # Gemini-enabled forms receive enough time for discovery plus one bounded AI call.
                        await asyncio.wait_for(
                            fill_and_submit(target, page),
                            timeout=domain_timeout
                        )
                    except asyncio.TimeoutError:
                        logger.warning(f"⊘ {domain}: Timeout (>{domain_timeout}s) during form processing")
                        results["skipped"].append({
                            "domain": domain,
                            "reason": f"Processing timeout (>{domain_timeout}s)"
                        })
                    except Exception as e:
                        logger.error(f"✗ {domain}: {type(e).__name__}: {e}")
                    finally:
                        if page:
                            try:
                                await asyncio.wait_for(page.close(), timeout=5)
                            except Exception:
                                pass
                        if context:
                            try:
                                await asyncio.wait_for(context.close(), timeout=5)
                            except Exception:
                                pass
                        processed += 1
                        elapsed = time.time() - domain_started
                        logger.info(f"[{domain}] FINISHED in {elapsed:.1f}s ({processed}/{len(domains)})")
                        # Print progress EVERY domain to keep connection alive
                        progress = {
                            "type": "progress",
                            "processed": processed,
                            "total": len(domains),
                            "submitted": len(results["submitted"]),
                            "failed": len(results["failed"]),
                            "skipped": len(results["skipped"])
                        }
                        submitted_item = next(
                            (item for item in reversed(results["submitted"]) if item.get("domain") == domain),
                            None,
                        )
                        if submitted_item:
                            progress["completed"] = {"domain": domain, "delivery": "form"}
                        safe_print(json.dumps(progress))
            
            try:
                # Allow one full domain timeout per three-worker wave plus startup/cleanup overhead.
                import math
                num_waves = math.ceil(len(domains) / effective_workers)
                timeout = min(max(num_waves * domain_timeout + 60, 300), 3600)
                await asyncio.wait_for(
                    asyncio.gather(*[bounded_fill(target) for target in domains]),
                    timeout=timeout
                )
            except asyncio.TimeoutError:
                logger.error(f"Auto-fill timed out after {timeout}s - outputting partial results")
            except Exception as e:
                logger.error(f"Error during batch processing: {e}")
            
            await browser.close()
    except Exception as e:
        logger.error(f"Fatal error in main: {e}")
    finally:
        # ALWAYS output final results, even on error/timeout
        logger.warning(f"✓ Complete: {len(results['submitted'])} submitted, {len(results['failed'])} failed, {len(results['skipped'])} skipped")
        final_result = {
            "submitted": results["submitted"],
            "failed": results["failed"],
            "skipped": results["skipped"]
        }
        safe_print(json.dumps(final_result))


if __name__ == "__main__":
    asyncio.run(main())
