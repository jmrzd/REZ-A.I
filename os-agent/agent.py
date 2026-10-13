"""Rez A.I OS Agent v0.1 — comandos locais seguros para Windows 10/11.

Sem acesso remoto, sem execução arbitrária e sem coleta de dados.
"""
from __future__ import annotations

import re
import unicodedata
import webbrowser
from dataclasses import dataclass
from typing import Callable

from policy import Action, SecurityPolicy

SITES = {
    "gmail": "https://mail.google.com/",
    "google mail": "https://mail.google.com/",
    "email": "https://mail.google.com/",
    "e-mail": "https://mail.google.com/",
    "correo": "https://mail.google.com/",
    "youtube": "https://www.youtube.com/",
    "github": "https://github.com/",
    "git hub": "https://github.com/",
    "spotify": "https://open.spotify.com/",
    "google": "https://www.google.com/",
    "rez ai": "https://github.com/jmrzd/REZ-A.I",
}
# Apenas URLs fixas e revisadas. Não aceite URLs arbitrárias vindas do modelo.
VERBS = {"abre", "abrir", "abra", "abrindo", "open", "launch", "start", "ouvrir", "ouvre", "abre", "abrime", "inicia"}
POLITE = {"por", "favor", "please", "s'il", "vous", "plait", "the", "o", "a", "el", "la", "my", "meu", "minha", "mi", "site", "app", "website", "pagina", "page", "no", "navegador", "browser", "rez", "hey", "oi", "ola", "ok", "can", "you", "could", "pode", "voce", "pra", "para", "mim"}

@dataclass(frozen=True)
class Result:
    ok: bool
    message: str
    target: str | None = None

def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return " ".join(re.sub(r"[^a-z0-9 -]+", " ", text).split())

def resolve(command: str) -> str | None:
    words = normalize(command).split()
    if not words or not any(w in VERBS for w in words):
        return None
    remaining = [w for w in words if w not in VERBS and w not in POLITE]
    phrase = " ".join(remaining)
    return SITES.get(phrase)

def execute(
    command: str,
    opener: Callable[[str], bool] = webbrowser.open,
    policy: SecurityPolicy | None = None,
) -> Result:
    url = resolve(command)
    if not url:
        return Result(False, "Comando não reconhecido. Experimente: Rez, abre o Gmail.")
    decision = (policy if policy is not None else SecurityPolicy()).authorize(
        Action.OPEN_APPROVED_SITE, url
    )
    if not decision.allowed:
        return Result(False, decision.reason)
    try:
        opened = opener(url)
    except Exception:
        return Result(False, "Não consegui abrir o navegador. Verifique o navegador padrão.")
    if not opened:
        return Result(False, "O navegador não confirmou a abertura do site.")
    return Result(True, "Abrindo no navegador padrão.", url)

def main() -> None:
    print("REZ A.I | OS Agent v0.1")
    print("Comandos: 'Rez, abre o Gmail', 'Rez, open YouTube', 'sair'.")
    print("Sites permitidos:", ", ".join(sorted(SITES)))
    while True:
        try:
            command = input("\nVocê > ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nAté logo!")
            break
        if normalize(command) in {"sair", "exit", "quit", "salir"}:
            print("Até logo!")
            break
        if not command:
            continue
        result = execute(command)
        print("Rez >", result.message)

if __name__ == "__main__":
    main()
