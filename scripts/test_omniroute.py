"""
Test script to verify OmniRoute connection from this machine
to an OmniRoute instance across your local network.

INSTRUCTIONS:
1. Ensure .env contains your configuration:
   - OMNIROUTE_IP=<ip_of_omniroute_host>
   - OMNIROUTE_PORT=20128
   - OMNIROUTE_API_KEY=<your_api_key>
   - OMNIROUTE_MODEL=auto

2. Prerequisites:
   pip install openai python-dotenv

3. Run:
   python scripts/test_omniroute.py
"""

from openai import OpenAI

from pathlib import Path
from dotenv import load_dotenv
import os

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

OMNIROUTE_IP = os.getenv("OMNIROUTE_IP", "127.0.0.1")
OMNIROUTE_PORT = os.getenv("OMNIROUTE_PORT", "20128")
OMNIROUTE_API_KEY = os.getenv("OMNIROUTE_API_KEY")
MODEL = os.getenv("OMNIROUTE_MODEL", "auto")
# ============================================================

OMNIROUTE_URL = os.getenv("OMNIROUTE_BASE_URL") or f"http://{OMNIROUTE_IP}:{OMNIROUTE_PORT}/v1"

def main():
    print(f"🔌 Connecting to OmniRoute at: {OMNIROUTE_URL}")
    print(f"🤖 Using model: {MODEL}")
    print("-" * 50)

    client = OpenAI(
        base_url=OMNIROUTE_URL,
        api_key=OMNIROUTE_API_KEY,
    )

    try:
        # First, test if we can reach OmniRoute by listing models
        print("📡 Testing connection (listing models)...")
        models = client.models.list()
        print(f"✅ Connected! Found {len(models.data)} models available.\n")

        # Now send a hello prompt
        print("💬 Sending test prompt: 'Hello! Who are you?'")
        print("-" * 50)

        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": "Hello! Who are you? Reply in 2-3 sentences."
                }
            ],
            max_tokens=200,
        )

        # Print the response
        reply = response.choices[0].message.content
        print(f"\n🤖 Response from {MODEL}:")
        print(reply)
        print("-" * 50)

        # Print usage stats
        if response.usage:
            print(f"\n📊 Token Usage:")
            print(f"   Prompt tokens:     {response.usage.prompt_tokens}")
            print(f"   Completion tokens: {response.usage.completion_tokens}")
            print(f"   Total tokens:      {response.usage.total_tokens}")

        print("\n✅ SUCCESS! OmniRoute is working across your network.")
        print("   Your Self-Forging AI Agent can use this endpoint.")

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        print("\nTroubleshooting:")
        print("  1. Is Docker running on the other laptop?")
        print("  2. Is OmniRoute container running? (docker ps)")
        print("  3. Is the IP address correct? (run ipconfig on that laptop)")
        print(f"  4. Is Windows Firewall blocking port {OMNIROUTE_PORT}?")
        print("     → On the OmniRoute laptop, run this in Admin PowerShell:")
        print(f'     → netsh advfirewall firewall add rule name="OmniRoute" dir=in action=allow protocol=TCP localport={OMNIROUTE_PORT}')


if __name__ == "__main__":
    main()
