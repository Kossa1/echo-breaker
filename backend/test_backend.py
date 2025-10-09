from reddit_logic.reddit_api import get_access_token, reddit_get

# Test token retrieval
token = get_access_token()
print("Access token:", token[:20], "...")  # don't print full token

# Test a simple Reddit request
response = reddit_get("/api/v1/me")
print(response)  # should show your Reddit account info
