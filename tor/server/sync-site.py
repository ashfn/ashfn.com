#!/usr/bin/python3
"""Run as the dedicated ashfn-site user. Never execute repository content."""
import fcntl
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile

ROOT = Path('/srv/ashfn-site')
REPO = ROOT / 'repository.git'
RELEASES = ROOT / 'releases'
REMOTE = 'https://github.com/ashfn/ashfn.github.io.git'

def git(*args):
    return subprocess.check_output(['git', '--git-dir', str(REPO), *args], text=True).strip()

def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    with (ROOT / '.sync.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        RELEASES.mkdir(exist_ok=True)
        if not REPO.exists():
            subprocess.run(['git', 'clone', '--bare', '--depth=1', '--single-branch', '--branch=main', REMOTE, str(REPO)], check=True)
        git('fetch', '--depth=1', REMOTE, 'refs/heads/main')
        revision = git('rev-parse', 'FETCH_HEAD')
        target = RELEASES / revision
        current = ROOT / 'current'
        if current.is_symlink() and current.resolve() == target:
            print('Already current:', revision)
            return
        with tempfile.TemporaryDirectory(prefix='.incoming-', dir=ROOT) as temp:
            archive = Path(temp) / 'site.tar'
            git('archive', '--format=tar', f'--output={archive}', revision)
            extracted = Path(temp) / 'site'
            extracted.mkdir()
            with tarfile.open(archive) as tar:
                for member in tar.getmembers():
                    if not (member.isfile() or member.isdir()):
                        raise RuntimeError('Only regular files and directories may be published')
                    parts = Path(member.name).parts
                    if Path(member.name).is_absolute() or '..' in parts or '.git' in parts:
                        raise RuntimeError('Unsafe archive path')
                tar.extractall(extracted, filter='data')
            if not (extracted / 'index.html').is_file():
                raise RuntimeError('Export has no index.html')
            for path in extracted.rglob('*'):
                path.chmod(0o755 if path.is_dir() else 0o644)
            extracted.chmod(0o755)
            if not target.exists():
                extracted.rename(target)
        link = ROOT / '.current-next'
        link.unlink(missing_ok=True)
        link.symlink_to(Path('releases') / revision)
        os.replace(link, current)
        # Keep the active version and two other recent versions for rollback.
        others = sorted((p for p in RELEASES.iterdir() if p.is_dir() and p != target), key=lambda p:p.stat().st_mtime, reverse=True)
        for old in others[2:]:
            shutil.rmtree(old)
        print('Published:', revision)

if __name__ == '__main__':
    main()
