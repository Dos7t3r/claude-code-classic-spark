import json, struct, sys, os

class Asar:
    def __init__(self, path):
        self.path = path
        self.filesize = os.path.getsize(path)
        self.f = open(path, 'rb')
        head = self.f.read(8)
        self.header_size = struct.unpack('<I', head[4:8])[0]
        self.f.seek(8)
        blob = self.f.read(self.header_size).decode('utf-8', 'replace')
        start = blob.index('{')
        self.index, end = json.JSONDecoder().raw_decode(blob[start:])
        self.base = 8 + self.header_size
        mx = 0
        for p, m in self.walk():
            if isinstance(m, dict) and 'offset' in m:
                mx = max(mx, int(m['offset']) + int(m['size']))
        self.data_base = self.filesize - mx

    def walk(self, node=None, prefix=''):
        node = node if node is not None else self.index['files']
        for name, meta in node.items():
            p = prefix + '/' + name
            if isinstance(meta, dict) and 'files' in meta:
                yield from self.walk(meta['files'], p)
            else:
                yield p, meta

    def read(self, entry):
        off = int(entry['offset']); size = int(entry['size'])
        self.f.seek(self.data_base + off)
        return self.f.read(size)

def main():
    target, cmd = sys.argv[1], sys.argv[2]
    a = Asar(target)
    print(f"# header={a.header_size} database={a.data_base} filesize={a.filesize}", file=sys.stderr)
    if cmd == 'list':
        pat = sys.argv[3] if len(sys.argv) > 3 else ''
        for p, m in a.walk():
            if pat in p:
                print(f"{m.get('size','?'):>10}  {p}")
    elif cmd == 'extract':
        outp = sys.argv[3]; pat = sys.argv[4] if len(sys.argv) > 4 else ''
        n = 0
        for p, m in a.walk():
            if pat in p and isinstance(m, dict) and 'offset' in m:
                dest = os.path.join(outp, p.lstrip('/'))
                os.makedirs(os.path.dirname(dest) or outp, exist_ok=True)
                with open(dest, 'wb') as fh:
                    fh.write(a.read(m))
                n += 1
        print(f"extracted {n} files to {outp}")
main()
