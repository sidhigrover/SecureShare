import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from './redis.js'
import { router as apiRouter } from './routes.js'

const app = express()

const origins = process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({ origin: origins?.length ? origins : true }))
app.use(express.json({ limit: '256kb' }))

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.use('/api', apiRouter)

// Handle share URLs - provide a web interface for viewing secrets
app.get('/s/:id', (req, res) => {
  const { id } = req.params
  
  // Create a full web interface for viewing secrets
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SecureShare - View Secret</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container { 
          max-width: 500px; 
          width: 100%;
          background: white; 
          padding: 40px; 
          border-radius: 16px; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          text-align: center;
        }
        .header { color: #6750A4; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 2em; }
        .header p { margin: 10px 0 0 0; opacity: 0.8; }
        .secret-box { 
          background: #f8f9fa; 
          border: 2px dashed #dee2e6; 
          border-radius: 12px; 
          padding: 20px; 
          margin: 20px 0;
          min-height: 80px;
          position: relative;
        }
        .secret-text {
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
          font-size: 15px;
          line-height: 1.4;
          word-break: break-word;
          white-space: pre-wrap;
          color: #2d3748;
          background: white;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          margin: 10px 0;
          max-height: 200px;
          overflow-y: auto;
        }
        .button { 
          background: #6750A4; 
          color: white; 
          padding: 15px 30px; 
          border: none; 
          border-radius: 8px; 
          font-size: 16px; 
          font-weight: 600;
          cursor: pointer; 
          width: 100%;
          margin: 10px 0;
          transition: background 0.3s;
        }
        .button:hover { background: #5a47a0; }
        .button:disabled { background: #ccc; cursor: not-allowed; }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          color: #856404;
          padding: 12px;
          border-radius: 8px;
          margin: 20px 0;
          font-size: 13px;
          text-align: center;
        }
        .error {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          color: #721c24;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .success {
          background: #f0fff4;
          border: 1px solid #9ae6b4;
          color: #2f855a;
          padding: 8px 12px;
          border-radius: 6px;
          margin: 10px 0 5px 0;
          font-size: 13px;
          text-align: center;
        }
        .loading { color: #6c757d; }
        .copy-btn {
          background: #48bb78;
          color: white;
          border: none;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.3s;
          margin-top: 8px;
        }
        .copy-btn:hover { background: #38a169; }
        .footer {
          margin-top: 30px;
          font-size: 12px;
          color: #6c757d;
          border-top: 1px solid #dee2e6;
          padding-top: 20px;
        }
        .icon { font-size: 2em; margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">🔒</div>
          <h1>SecureShare</h1>
          <p>Secure, encrypted secret sharing</p>
        </div>

        <div class="warning">
          ⚠️ <strong>One-time view:</strong> Will be deleted after viewing!
        </div>

        <div id="content">
          <div class="secret-box">
            <div class="loading">Click below to decrypt and view your secret...</div>
          </div>
          <button class="button" onclick="viewSecret()">View Secret</button>
        </div>

        <div class="footer">
          <p>🛡️ End-to-end encrypted • 🔥 Auto-expires • 📱 <a href="https://github.com/sidharth2829/Secure-Share" style="color: #6750A4;">Get the app</a></p>
        </div>
      </div>

      <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
      <script>
        const secretId = '${id}';
        const currentUrl = window.location.href;
        
        function parseShareUrl(urlStr) {
          try {
            const url = new URL(urlStr);
            const id = url.pathname.split('/').pop();
            const hash = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
            const params = new URLSearchParams(hash);
            const [keyB64, ivB64] = (params.get('key') || '').split(':');
            if (!id || !keyB64 || !ivB64) return null;
            return { id, keyB64: decodeURIComponent(keyB64), ivB64: decodeURIComponent(ivB64) };
          } catch {
            return null;
          }
        }

        function decryptAesCbc(cipherTextB64, keyB64, ivB64) {
          const key = CryptoJS.enc.Base64.parse(keyB64);
          const iv = CryptoJS.enc.Base64.parse(ivB64);
          const cipherParams = CryptoJS.lib.CipherParams.create({ 
            ciphertext: CryptoJS.enc.Base64.parse(cipherTextB64) 
          });
          const decrypted = CryptoJS.AES.decrypt(cipherParams, key, { 
            iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 
          });
          return CryptoJS.enc.Utf8.stringify(decrypted);
        }

        async function viewSecret() {
          const button = document.querySelector('.button');
          const content = document.querySelector('.secret-box');
          
          try {
            button.disabled = true;
            button.textContent = 'Decrypting...';
            content.innerHTML = '<div class="loading">🔄 Fetching and decrypting your secret...</div>';

            // Parse the URL to get encryption keys
            const parsed = parseShareUrl(currentUrl);
            if (!parsed) {
              throw new Error('Invalid share URL - missing encryption keys');
            }

            const { keyB64, ivB64 } = parsed;

            // Fetch the encrypted secret
            const response = await fetch(\`/api/secret/\${secretId}\`);
            if (!response.ok) {
              if (response.status === 404) {
                throw new Error('Secret not found or already viewed');
              }
              throw new Error(\`Failed to fetch secret (\${response.status})\`);
            }

            const data = await response.json();
            
            // Decrypt the secret
            const plaintext = decryptAesCbc(data.cipherText, keyB64, ivB64);
            
            if (!plaintext) {
              throw new Error('Failed to decrypt - invalid keys or corrupted data');
            }

            // Show the decrypted secret
            content.innerHTML = \`
              <div class="success">✅ Decrypted successfully</div>
              <div class="secret-text">\${escapeHtml(plaintext)}</div>
              <button class="copy-btn" onclick="copySecret()">📋 Copy</button>
            \`;
            
            button.style.display = 'none';
            
            // Store for copying
            window.decryptedSecret = plaintext;

          } catch (error) {
            console.error('Error:', error);
            content.innerHTML = \`
              <div class="error">
                ❌ Error: \${escapeHtml(error.message)}
              </div>
            \`;
            button.disabled = false;
            button.textContent = 'Try Again';
          }
        }

        async function copySecret() {
          try {
            await navigator.clipboard.writeText(window.decryptedSecret);
            const btn = document.querySelector('.copy-btn');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            btn.style.background = '#20c997';
            setTimeout(() => {
              btn.textContent = originalText;
              btn.style.background = '#28a745';
            }, 2000);
          } catch (error) {
            alert('Failed to copy to clipboard');
          }
        }

        function escapeHtml(text) {
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }

        // Auto-decrypt if URL seems complete
        if (window.location.hash && window.location.hash.includes('key=')) {
          document.addEventListener('DOMContentLoaded', () => {
            setTimeout(viewSecret, 500);
          });
        }
      </script>
    </body>
    </html>
  `)
})

const port = Number(process.env.PORT || 4000)

const start = async () => {
  try {
    await createClient()
    app.listen(port, () => {
      console.log(`SecureShare server listening on http://localhost:${port}`)
    })
  } catch (err) {
    console.error('Failed to start server', err)
    process.exit(1)
  }
}

start()
