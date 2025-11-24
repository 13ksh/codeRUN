const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs/promises");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const cppDir = path.join(__dirname, "cppRUN");
const workDir = path.join(__dirname, "workapace");
const cppFile = path.join(cppDir, "run.cpp");

const ensureWorkDir = () => fs.mkdir(workDir, { recursive: true });

const sanitizeName = (input) => {
    if (!input || typeof input !== "string") {
        throw new Error("파일 이름이 필요합니다.");
    }
    const trimmed = input.trim();
    if (!trimmed) {
        throw new Error("파일 이름이 필요합니다.");
    }
    const base = path.basename(trimmed);
    const safeName = base.endsWith(".cpp") ? base : `${base}.cpp`;
    const resolved = path.join(workDir, safeName);
    if (!resolved.startsWith(workDir)) {
        throw new Error("잘못된 파일 경로입니다.");
    }
    return { safeName, resolved };
};

app.get("/files", async (req, res) => {
    try {
        await ensureWorkDir();
        const entries = await fs.readdir(workDir, { withFileTypes: true });
        const files = entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".cpp"))
            .map((entry) => entry.name);
        res.json({ files });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

app.get("/file", async (req, res) => {
    try {
        const { safeName, resolved } = sanitizeName(req.query.name);
        const code = await fs.readFile(resolved, "utf8");
        res.json({ name: safeName, code });
    } catch (err) {
        const status = err.code === "ENOENT" ? 404 : 400;
        res.status(status).json({ ok: false, message: err.message });
    }
});

app.post("/files", async (req, res) => {
    const { name, code = "" } = req.body || {};
    try {
        const { safeName, resolved } = sanitizeName(name);
        await ensureWorkDir();
        await fs.writeFile(resolved, code, "utf8");
        res.json({ ok: true, name: safeName });
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
    }
});

const deleteFile = async (nameInput, res) => {
    let target;
    try {
        target = sanitizeName(nameInput);
    } catch (err) {
        res.status(400).json({ ok: false, message: err.message });
        return;
    }

    try {
        await fs.unlink(target.resolved);
        res.json({ ok: true, name: target.safeName });
    } catch (err) {
        const status = err.code === "ENOENT" ? 404 : 500;
        res.status(status).json({ ok: false, message: err.message });
    }
};

app.delete("/file", async (req, res) => {
    const nameInput = (req.body && req.body.name) || req.query.name;
    await deleteFile(nameInput, res);
});

app.delete("/file/:name", async (req, res) => {
    await deleteFile(req.params.name, res);
});

app.post("/run", async (req, res) => {
    const { filename } = req.body || {};
    let target;
    try {
        target = sanitizeName(filename);
    } catch (err) {
        return res.status(400).json({ ok: false, message: err.message });
    }

    try {
        const code = await fs.readFile(target.resolved, "utf8");
        await fs.writeFile(cppFile, code, "utf8");
    } catch (err) {
        const status = err.code === "ENOENT" ? 404 : 500;
        return res.status(status).json({ ok: false, message: err.message });
    }

    const child = spawn(
        "cmd.exe",
        [
            "/c",
            "start",
            "",
            "/D",
            cppDir,
            "run.bat",
        ],
        {
            windowsHide: false,
            detached: true,
            stdio: "ignore",
        }
    );

    child.once("error", (launchErr) => {
        if (!res.headersSent) {
            res.status(500).json({ ok: false, message: launchErr.message });
        }
    });

    child.once("spawn", () => {
        child.unref();
        if (!res.headersSent) {
            res.json({ ok: true, message: "CMD 창에서 실행을 확인하세요." });
        }
    });
});

app.listen(3000, () => {
    console.log("Local Node running at http://localhost:3000");
});
