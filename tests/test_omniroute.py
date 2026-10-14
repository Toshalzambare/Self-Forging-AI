"""
Test script to verify OmniRoute connection from this laptop
to the OmniRoute instance running on the other laptop.

INSTRUCTIONS:
1. Find the IP of the laptop running OmniRoute:
   - On THAT laptop, open terminal and run: ipconfig
   - Look for "IPv4 Address" under Wi-Fi (e.g., 192.168.1.105)

2. Replace OMNIROUTE_IP below with that IP address.

3. Replace OMNIROUTE_API_KEY with your actual OmniRoute API key.

4. Run: pip install openai
   Then: python test_omniroute.py
"""

from openai import OpenAI

# ============================================================
# CONFIGURE THESE TWO VALUES
# ============================================================
from dotenv import load_dotenv
import os

load_dotenv("C:\devlopment\Final Year Project\Self-Forging-AI\.env")

OMNIROUTE_IP = "192.168.1.3"
OMNIROUTE_API_KEY = os.getenv("OMNIROUTE_API_KEY")
MODEL = "auto"
# ============================================================

OMNIROUTE_URL = f"http://{OMNIROUTE_IP}:20128/v1"

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
        print("  4. Is Windows Firewall blocking port 20128?")
        print("     → On the OmniRoute laptop, run this in Admin PowerShell:")
        print('     → netsh advfirewall firewall add rule name="OmniRoute" dir=in action=allow protocol=TCP localport=20128')


if __name__ == "__main__":
    main()
