import SimpleHTTPServer
import SocketServer

port = 8081

httpHandler = SimpleHTTPServer.SimpleHTTPRequestHandler
httpHandler.extensions_map['svg'] = 'image/svg+xml'
httpHandler.extensions_map['.svg'] = 'image/svg+xml'

httpd = SocketServer.TCPServer(("", port), httpHandler)

print "serving at port", port
httpd.serve_forever()
