# HIVOLT B2B Reacher

Public product copy. No vendor token generator and no signing secret are stored here.

The first screen is the **ACCESS TOKEN** login. Extract / template / Reach-out stay locked until a vendor-issued token is pasted.

Each install needs `license.secret` in the project root (sent privately by the vendor). Setup will ask for it. That file is gitignored.

## Windows RDP install

1. Clone this repo onto the machine.
2. Right-click `setup.bat` and **Run as administrator**.
3. Setup installs Node 22 if missing, runs `npm install`, asks for the vendor license secret, a domain, and a port (default 80).
4. Point the domain A record at the public IP printed by setup.
5. Double-click `start-hivolt.bat` or run:

```bat
node .\node_modules\vite\bin\vite.js dev --host 0.0.0.0 --port 80
```

6. Press **o** then **Enter**. You should see HIVOLT / B2B REACHER and ACCESS TOKEN.

## Dev

```bash
npm install
npm run dev
```

http://localhost:8080 — Node 22+.

## Limits

Use this for people you already have addresses for. Unsolicited bulk email may be illegal where you are.
