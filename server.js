const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs/promises");

const app = express();
app.use(express.json());

app.use(express.static(__dirname));

app.post("/run", async (req, res) => {
    const cppDir = path.join(__dirname, "cppRUN");
    const cppFile = path.join(cppDir, "run.cpp");
    const { code } = req.body || {};

    if (typeof code !== "string" || !code.trim()) {
        return res.status(400).json({ ok: false, message: "코드 입력이 필요합니다." });
    }

    try {
        await fs.writeFile(cppFile, code, "utf8");
    } catch (err) {
        return res.status(500).json({ ok: false, message: `코드 저장 실패: ${err.message}` });
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
            res.json({ ok: true, message: "NULL" });
        }
    });
});

app.listen(3000, () => {
    console.log("Local Node running at http://localhost:3000");
});
