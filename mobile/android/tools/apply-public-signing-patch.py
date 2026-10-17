"""Reconstruct a locally signed APK from immutable unsigned bytes + public signature."""
import base64, hashlib, json, pathlib, sys
source,patch,destination=map(pathlib.Path,sys.argv[1:])
record=json.loads(patch.read_text())
with source.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==record['unsigned_sha256']
with source.open('rb') as f,destination.open('wb') as out:
    def copy(count):
        while count:
            chunk=f.read(min(count,1048576));assert chunk;out.write(chunk);count-=len(chunk)
    copy(record['insert_offset']);out.write(base64.b64decode(record['signature_base64'],validate=True));out.write(base64.b64decode(record['tail_base64'],validate=True))
assert destination.stat().st_size==record['signed_bytes']
with destination.open('rb') as f:assert hashlib.file_digest(f,'sha256').hexdigest()==record['signed_sha256']
print('PASS: byte-for-byte locally signed APK reconstructed; signing key remains local')
