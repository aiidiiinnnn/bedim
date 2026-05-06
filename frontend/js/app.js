// ============================================
// CONFIG
// ============================================
const CONFIG = {
    API_BASE_URL: "http://127.0.0.1:8000",
    WS_BASE_URL: "ws://127.0.0.1:8000",
    RECONNECT_DELAY: 2000,
    TOKEN_KEY: "token",
};


// ============================================
// STATE
// ============================================
const state = {
    ws: null,
    token: localStorage.getItem(CONFIG.TOKEN_KEY),
    username: null,
    reconnectTimer: null,
};


// ============================================
// DOM ELEMENTS
// ============================================
const dom = {
    username: document.getElementById("username"),
    password: document.getElementById("password"),
    loginBtn: document.getElementById("loginBtn"),

    chat: document.getElementById("chat"),
    status: document.getElementById("status"),

    msgBox: document.getElementById("msgBox"),
    sendBtn: document.getElementById("sendBtn"),
    imgBtn: document.getElementById("imgBtn"),
    imageInput: document.getElementById("imageInput"),
};


// ============================================
// UI HELPERS
// ============================================
function updateStatus(connected) {
    dom.status.textContent = connected ? "Connected" : "Disconnected";
    dom.status.classList.toggle("connected", connected);
    dom.status.classList.toggle("disconnected", !connected);
}

function clearChat() {
    dom.chat.innerHTML = "";
}

function normalizeImageUrl(url) {
    if (url.startsWith("/uploads")) {
        return CONFIG.API_BASE_URL + url;
    }
    return url;
}

function addBubble(sender, type, content, mine) {
    const bubble = document.createElement("div");
    bubble.classList.add("bubble", mine ? "bubble-out" : "bubble-in");

    if (!mine) {
        const senderDiv = document.createElement("div");
        senderDiv.classList.add("sender");
        senderDiv.textContent = sender;
        bubble.appendChild(senderDiv);
    }

    if (type === "text") {
        const textDiv = document.createElement("div");
        textDiv.textContent = content;
        bubble.appendChild(textDiv);
    }

    if (type === "image") {
        const img = document.createElement("img");
        img.src = normalizeImageUrl(content);
        bubble.appendChild(img);
    }

    dom.chat.appendChild(bubble);
    dom.chat.scrollTop = dom.chat.scrollHeight;
}


// ============================================
// API CALLS
// ============================================
async function apiLogin(username, password) {
    const url = `${CONFIG.API_BASE_URL}/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const res = await fetch(url, { method: "POST" });

    if (!res.ok) throw new Error("Login failed");

    return res.json();
}

async function apiGetHistory() {
    const res = await fetch(`${CONFIG.API_BASE_URL}/messages`);
    if (!res.ok) throw new Error("Cannot load history");
    return res.json();
}


// ============================================
// HISTORY LOADING
// ============================================
async function loadHistory() {
    try {
        const history = await apiGetHistory();
        clearChat();

        history.forEach((msg) => {
            addBubble(
                msg.sender,
                msg.type,
                msg.content,
                msg.sender === state.username
            );
        });
    } catch (e) {
        console.error("History error", e);
    }
}


// ============================================
// WEBSOCKET HANDLER
// ============================================
function connectWS() {
    if (!state.token) return;

    const wsURL = `${CONFIG.WS_BASE_URL}/ws/chat?token=${encodeURIComponent(state.token)}`;
    state.ws = new WebSocket(wsURL);

    state.ws.onopen = () => {
        console.log("WS connected");
        updateStatus(true);
    };

    state.ws.onclose = () => {
        console.log("WS disconnected");
        updateStatus(false);

        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = setTimeout(() => {
            console.log("Reconnecting WS...");
            connectWS();
        }, CONFIG.RECONNECT_DELAY);
    };

    state.ws.onerror = (err) => console.error("WS error:", err);

    state.ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);

            addBubble(
                msg.sender,
                msg.type,
                msg.content,
                msg.sender === state.username
            );
        } catch (e) {
            console.error("WS parse error", e);
        }
    };
}

function wsSend(payload) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        alert("WebSocket is not connected");
        return;
    }
    state.ws.send(JSON.stringify(payload));
}


// ============================================
// CHAT INPUT HANDLERS
// ============================================
function sendText() {
    const text = dom.msgBox.value.trim();
    if (!text) return;

    wsSend({ type: "text", content: text });
    dom.msgBox.value = "";
}

function pickImage() {
    dom.imageInput.value = "";
    dom.imageInput.click();
}

function sendImage() {
    const file = dom.imageInput.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        wsSend({ type: "image", content: reader.result });
    };

    reader.readAsDataURL(file);
}


// ============================================
// AUTH HANDLER
// ============================================
async function login() {
    const username = dom.username.value.trim();
    const password = dom.password.value.trim();

    if (!username || !password) {
        alert("Please enter username and password");
        return;
    }

    try {
        const data = await apiLogin(username, password);

        state.token = data.token;
        state.username = username;

        localStorage.setItem(CONFIG.TOKEN_KEY, data.token);

        await loadHistory();
        connectWS();

    } catch (e) {
        console.error(e);
        alert("Login failed");
    }
}


// ============================================
// EVENT BINDINGS
// ============================================
dom.loginBtn.addEventListener("click", login);
dom.sendBtn.addEventListener("click", sendText);
dom.imgBtn.addEventListener("click", pickImage);
dom.imageInput.addEventListener("change", sendImage);

dom.msgBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendText();
});


// ============================================
// OPTIONAL: RESTORE SESSION
// ============================================
if (state.token) {
    console.log("Restoring previous session...");
    // You may auto login or auto-connect WS here if backend supports it
}
