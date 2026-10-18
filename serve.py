#!/usr/bin/env python3
"""Tiny no-cache static server for EMBERDEEP.   usage:  python3 serve.py [port]   (default: $PORT, else 8000)
Opening index.html straight from disk works too — this is only here for convenience."""
import http.server, socketserver, sys, os

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()
    def log_message(self, fmt, *args):
        pass

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT', 8000))
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', port), Handler) as httpd:
        print('EMBERDEEP on http://localhost:%d/' % port)
        httpd.serve_forever()
