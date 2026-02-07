const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

// Screen capture and control utilities
class ScreenController {
    constructor() {
        this.screenWidth = 1920;
        this.screenHeight = 1080;
        this.platform = os.platform();
        this.detectScreenSize();
    }

    detectScreenSize() {
        // Detect actual screen size based on platform
        if (this.platform === 'darwin') {
            // macOS
            exec('system_profiler SPDisplaysDataType | grep Resolution', (err, stdout) => {
                if (!err && stdout) {
                    const match = stdout.match(/(\d+)\s*x\s*(\d+)/);
                    if (match) {
                        this.screenWidth = parseInt(match[1]);
                        this.screenHeight = parseInt(match[2]);
                        console.log(`✅ Screen size detected: ${this.screenWidth}x${this.screenHeight}`);
                    }
                }
            });
        } else if (this.platform === 'win32') {
            // Windows - use PowerShell
            exec('powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height"', (err, stdout) => {
                if (!err && stdout) {
                    const lines = stdout.trim().split('\n');
                    if (lines.length >= 2) {
                        this.screenWidth = parseInt(lines[0].trim());
                        this.screenHeight = parseInt(lines[1].trim());
                        console.log(`✅ Screen size detected: ${this.screenWidth}x${this.screenHeight}`);
                    }
                }
            });
        } else if (this.platform === 'linux') {
            exec('xdpyinfo | grep dimensions', (err, stdout) => {
                if (!err && stdout) {
                    const match = stdout.match(/(\d+)x(\d+)/);
                    if (match) {
                        this.screenWidth = parseInt(match[1]);
                        this.screenHeight = parseInt(match[2]);
                        console.log(`✅ Screen size detected: ${this.screenWidth}x${this.screenHeight}`);
                    }
                }
            });
        }
    }

    // Mouse control using platform-specific tools
    moveMouse(x, y) {
        console.log(`🖱️  Moving mouse to: ${x}, ${y}`);
        
        if (this.platform === 'darwin') {
            // macOS - Try cliclick first (most reliable)
            exec(`cliclick m:${x},${y}`, (err) => {
                if (err) {
                    // cliclick not installed - try alternative
                    exec(`/opt/homebrew/bin/cliclick m:${x},${y}`, (err2) => {
                        if (err2) {
                            // Show installation message only once
                            if (!this.cliclickWarningShown) {
                                console.log('\n⚠️  CLICLICK NOT INSTALLED');
                                console.log('To enable mouse control, install cliclick:');
                                console.log('   brew install cliclick');
                                console.log('Then restart the server.\n');
                                this.cliclickWarningShown = true;
                            }
                        }
                    });
                }
            });
        } else if (this.platform === 'win32') {
            // Windows - Using PowerShell
            const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y})`;
            exec(`powershell -Command "${ps}"`, (err) => {
                if (err) console.error('Mouse move error:', err.message);
            });
        } else if (this.platform === 'linux') {
            // Linux - Use xdotool
            exec(`xdotool mousemove ${x} ${y}`, (err) => {
                if (err) console.error('Mouse move error (install xdotool):', err.message);
            });
        }
    }

    click(button = 'left') {
        console.log(`👆 Clicking: ${button} button`);
        
        if (this.platform === 'darwin') {
            // macOS - Try cliclick
            const clickCmd = button === 'right' ? 'rc:.' : 'c:.';
            exec(`cliclick ${clickCmd}`, (err) => {
                if (err) {
                    exec(`/opt/homebrew/bin/cliclick ${clickCmd}`, (err2) => {
                        if (err2 && !this.cliclickWarningShown) {
                            console.log('\n⚠️  Install cliclick for mouse control: brew install cliclick\n');
                            this.cliclickWarningShown = true;
                        }
                    });
                }
            });
        } else if (this.platform === 'win32') {
            // Windows
            const mouseEvent = button === 'right' ? '0x0008, 0, 0, 0, 0); [Mouse]::mouse_event(0x0010' : '0x0002, 0, 0, 0, 0); [Mouse]::mouse_event(0x0004';
            const ps = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int d, int ex);' -Name Mouse -Namespace W; [W.Mouse]::mouse_event(${mouseEvent}, 0, 0, 0, 0)`;
            exec(`powershell -Command "${ps}"`, (err) => {
                if (err) console.error('Click error:', err.message);
            });
        } else if (this.platform === 'linux') {
            // Linux
            const buttonNum = button === 'right' ? '3' : '1';
            exec(`xdotool click ${buttonNum}`, (err) => {
                if (err) console.error('Click error:', err.message);
            });
        }
    }

    scroll(direction, amount = 3) {
        console.log(`📜 Scrolling: ${direction} by ${amount}`);
        
        if (this.platform === 'darwin') {
            // macOS - using scroll gestures
            const scrollAmount = direction === 'down' ? amount : -amount;
            exec(`osascript -e 'tell application "System Events" to tell process "System Events" to scroll {0, ${scrollAmount * 10}}'`, (err) => {
                if (err) {
                    // Fallback to key codes
                    const keyCode = direction === 'down' ? '121' : '116';
                    exec(`osascript -e 'tell application "System Events" to key code ${keyCode}'`);
                }
            });
        } else if (this.platform === 'win32') {
            // Windows
            const scrollDir = direction === 'down' ? -120 : 120;
            const ps = `Add-Type -MemberDefinition '[DllImport("user32.dll")] public static extern void mouse_event(int flags, int dx, int dy, int d, int ex);' -Name Mouse -Namespace W; [W.Mouse]::mouse_event(0x0800, 0, 0, ${scrollDir * amount}, 0)`;
            exec(`powershell -Command "${ps}"`, (err) => {
                if (err) console.error('Scroll error:', err.message);
            });
        } else if (this.platform === 'linux') {
            // Linux
            const button = direction === 'down' ? '5' : '4';
            exec(`xdotool click --repeat ${amount} ${button}`, (err) => {
                if (err) console.error('Scroll error:', err.message);
            });
        }
    }

    typeText(text) {
        console.log(`⌨️  Typing: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`);
        
        if (this.platform === 'darwin') {
            // macOS - escape special characters properly
            const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            exec(`osascript -e 'tell application "System Events" to keystroke "${escaped}"'`, (err) => {
                if (err) console.error('Type error:', err.message);
            });
        } else if (this.platform === 'win32') {
            // Windows
            const escaped = text.replace(/"/g, '""').replace(/\\/g, '\\\\');
            const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("${escaped}")`;
            exec(`powershell -Command "${ps}"`, (err) => {
                if (err) console.error('Type error:', err.message);
            });
        } else if (this.platform === 'linux') {
            // Linux
            const escaped = text.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
            exec(`xdotool type "${escaped}"`, (err) => {
                if (err) console.error('Type error:', err.message);
            });
        }
    }

    pressKey(key, modifier = null) {
        console.log(`⌨️  Pressing key: ${modifier ? modifier + '+' : ''}${key}`);
        
        if (this.platform === 'darwin') {
            // macOS key mappings
            const keyMap = {
                'escape': '53', 'enter': '36', 'tab': '48',
                'backspace': '51', 'delete': '51',
                'up': '126', 'down': '125', 'left': '123', 'right': '124',
                'pageup': '116', 'pagedown': '121',
                'home': '115', 'end': '119', 'space': '49',
                'f5': '96', 'f11': '103'
            };
            
            const keyCode = keyMap[key.toLowerCase()] || key;
            let modStr = '';
            
            if (modifier) {
                const mods = Array.isArray(modifier) ? modifier : [modifier];
                const modParts = [];
                if (mods.includes('control')) modParts.push('control down');
                if (mods.includes('command')) modParts.push('command down');
                if (mods.includes('shift')) modParts.push('shift down');
                if (mods.includes('option') || mods.includes('alt')) modParts.push('option down');
                modStr = modParts.length > 0 ? ` using {${modParts.join(', ')}}` : '';
            }
            
            exec(`osascript -e 'tell application "System Events" to key code ${keyCode}${modStr}'`, (err) => {
                if (err) console.error('Key press error:', err.message);
            });
        } else if (this.platform === 'win32') {
            // Windows key mappings
            const keyMap = {
                'escape': '{ESC}', 'enter': '{ENTER}', 'tab': '{TAB}',
                'backspace': '{BACKSPACE}', 'delete': '{DELETE}',
                'up': '{UP}', 'down': '{DOWN}', 'left': '{LEFT}', 'right': '{RIGHT}',
                'pageup': '{PGUP}', 'pagedown': '{PGDN}',
                'home': '{HOME}', 'end': '{END}', 'space': ' ',
                'f5': '{F5}', 'f11': '{F11}'
            };
            
            const winKey = keyMap[key.toLowerCase()] || key;
            let modPrefix = '';
            
            if (modifier) {
                if (modifier === 'control' || modifier === 'ctrl') modPrefix = '^';
                else if (modifier === 'shift') modPrefix = '+';
                else if (modifier === 'alt') modPrefix = '%';
            }
            
            const ps = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("${modPrefix}${winKey}")`;
            exec(`powershell -Command "${ps}"`, (err) => {
                if (err) console.error('Key press error:', err.message);
            });
        } else if (this.platform === 'linux') {
            // Linux
            let cmd = 'xdotool key ';
            if (modifier) cmd += `${modifier}+`;
            cmd += key;
            exec(cmd, (err) => {
                if (err) console.error('Key press error:', err.message);
            });
        }
    }

    // Presentation shortcuts
    nextSlide() { this.pressKey('right'); }
    previousSlide() { this.pressKey('left'); }
    playPause() { this.pressKey('space'); }
    
    volumeUp() {
        console.log('🔊 Volume up');
        if (this.platform === 'darwin') {
            exec('osascript -e "set volume output volume (output volume of (get volume settings) + 10)"');
        } else if (this.platform === 'win32') {
            const ps = `(New-Object -ComObject WScript.Shell).SendKeys([char]175)`;
            exec(`powershell -Command "${ps}"`);
        } else {
            exec('amixer -D pulse sset Master 5%+');
        }
    }
    
    volumeDown() {
        console.log('🔉 Volume down');
        if (this.platform === 'darwin') {
            exec('osascript -e "set volume output volume (output volume of (get volume settings) - 10)"');
        } else if (this.platform === 'win32') {
            const ps = `(New-Object -ComObject WScript.Shell).SendKeys([char]174)`;
            exec(`powershell -Command "${ps}"`);
        } else {
            exec('amixer -D pulse sset Master 5%-');
        }
    }
    
    toggleFullscreen() {
        console.log('⛶ Toggle fullscreen');
        if (this.platform === 'darwin') {
            this.pressKey('f', ['control', 'command']);
        } else {
            this.pressKey('f11');
        }
    }
}

// WebSocket server implementation
class WebSocketServer {
    constructor(server) {
        this.clients = new Set();
        this.controller = new ScreenController();
        
        server.on('upgrade', (request, socket, head) => {
            if (request.headers['upgrade'] !== 'websocket') {
                socket.end('HTTP/1.1 400 Bad Request');
                return;
            }

            const key = request.headers['sec-websocket-key'];
            const acceptKey = this.generateAcceptKey(key);
            
            const headers = [
                'HTTP/1.1 101 Switching Protocols',
                'Upgrade: websocket',
                'Connection: Upgrade',
                `Sec-WebSocket-Accept: ${acceptKey}`,
                '',
                ''
            ].join('\r\n');
            
            socket.write(headers);
            
            const client = {
                socket: socket,
                id: Math.random().toString(36).substr(2, 9)
            };
            
            this.clients.add(client);
            console.log(`✅ Client connected: ${client.id} (Total: ${this.clients.size})`);
            
            // Send initial screen info
            this.send(client, {
                type: 'init',
                screenWidth: this.controller.screenWidth,
                screenHeight: this.controller.screenHeight,
                platform: this.controller.platform
            });
            
            socket.on('data', (buffer) => {
                const messages = this.decodeFrame(buffer);
                messages.forEach(message => {
                    if (message) this.handleMessage(client, message);
                });
            });
            
            socket.on('close', () => {
                this.clients.delete(client);
                console.log(`❌ Client disconnected: ${client.id} (Total: ${this.clients.size})`);
            });
            
            socket.on('error', (err) => {
                console.error('Socket error:', err.message);
                this.clients.delete(client);
            });
        });
    }
    
    generateAcceptKey(key) {
        const crypto = require('crypto');
        const magicString = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
        return crypto
            .createHash('sha1')
            .update(key + magicString)
            .digest('base64');
    }
    
    decodeFrame(buffer) {
        const messages = [];
        let offset = 0;
        
        while (offset < buffer.length) {
            if (buffer.length - offset < 2) break;
            
            const firstByte = buffer[offset];
            const secondByte = buffer[offset + 1];
            
            const opcode = firstByte & 0x0F;
            
            if (opcode === 0x08) break; // Close frame
            if (opcode !== 0x01 && opcode !== 0x02) { offset++; continue; }
            
            const isMasked = Boolean(secondByte & 0x80);
            let payloadLength = secondByte & 0x7F;
            offset += 2;
            
            if (payloadLength === 126) {
                if (buffer.length - offset < 2) break;
                payloadLength = buffer.readUInt16BE(offset);
                offset += 2;
            } else if (payloadLength === 127) {
                if (buffer.length - offset < 8) break;
                payloadLength = buffer.readUInt32BE(offset + 4);
                offset += 8;
            }
            
            if (!isMasked) break;
            
            if (buffer.length - offset < 4 + payloadLength) break;
            
            const maskingKey = buffer.slice(offset, offset + 4);
            offset += 4;
            
            const payload = Buffer.alloc(payloadLength);
            for (let i = 0; i < payloadLength; i++) {
                payload[i] = buffer[offset + i] ^ maskingKey[i % 4];
            }
            offset += payloadLength;
            
            messages.push(payload.toString('utf8'));
        }
        
        return messages;
    }
    
    encodeFrame(message) {
        const payload = Buffer.from(message);
        const payloadLength = payload.length;
        
        let frame;
        if (payloadLength <= 125) {
            frame = Buffer.alloc(2 + payloadLength);
            frame[0] = 0x81;
            frame[1] = payloadLength;
            payload.copy(frame, 2);
        } else if (payloadLength <= 65535) {
            frame = Buffer.alloc(4 + payloadLength);
            frame[0] = 0x81;
            frame[1] = 126;
            frame.writeUInt16BE(payloadLength, 2);
            payload.copy(frame, 4);
        } else {
            frame = Buffer.alloc(10 + payloadLength);
            frame[0] = 0x81;
            frame[1] = 127;
            frame.writeUInt32BE(0, 2);
            frame.writeUInt32BE(payloadLength, 6);
            payload.copy(frame, 10);
        }
        
        return frame;
    }
    
    handleMessage(client, message) {
        try {
            const data = JSON.parse(message);
            
            switch(data.type) {
                case 'mouse_move':
                    this.controller.moveMouse(data.x, data.y);
                    break;
                    
                case 'mouse_click':
                    this.controller.click(data.button);
                    break;
                    
                case 'scroll':
                    this.controller.scroll(data.direction, data.amount);
                    break;
                    
                case 'key_press':
                    this.controller.pressKey(data.key, data.modifier);
                    break;
                    
                case 'type_text':
                    this.controller.typeText(data.text);
                    break;
                    
                case 'next_slide':
                    this.controller.nextSlide();
                    break;
                    
                case 'prev_slide':
                    this.controller.previousSlide();
                    break;
                    
                case 'play_pause':
                    this.controller.playPause();
                    break;
                    
                case 'volume_up':
                    this.controller.volumeUp();
                    break;
                    
                case 'volume_down':
                    this.controller.volumeDown();
                    break;
                    
                case 'toggle_fullscreen':
                    this.controller.toggleFullscreen();
                    break;
                    
                default:
                    console.log('Unknown command:', data.type);
            }
        } catch (err) {
            console.error('Error parsing message:', err.message);
        }
    }
    
    send(client, data) {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        const frame = this.encodeFrame(message);
        
        if (client.socket.writable) {
            try {
                client.socket.write(frame);
            } catch (err) {
                console.error('Error sending message:', err.message);
            }
        }
    }
}

// HTTP server
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    let filePath = '';
    
    if (req.url === '/' || req.url === '/controller') {
        filePath = path.join(__dirname, 'controller.html');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
    }
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading page');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// Initialize WebSocket server
const wss = new WebSocketServer(server);

// Get local IP
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const PORT = 8080;
const localIP = getLocalIP();

server.listen(PORT, '0.0.0.0', () => {
    console.clear();
    console.log('\n🎓 ClassroomControl - Lightweight Teaching Remote\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📱 MOBILE CONTROLLER (Open on your phone):');
    console.log(`   http://${localIP}:${PORT}/controller`);
    console.log(`   http://localhost:${PORT}/controller\n`);
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Platform: ${os.platform()}`);
    console.log(`Screen: ${wss.controller.screenWidth}x${wss.controller.screenHeight}\n`);
    console.log('✨ Ready to control your computer from your phone!\n');
    console.log('Press Ctrl+C to stop\n');
});

process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down ClassroomControl...');
    server.close(() => {
        console.log('✅ Server stopped. Goodbye!\n');
        process.exit(0);
    });
});