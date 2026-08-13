# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: public-site.spec.ts >> Public site >> landing page renders the core sections
- Location: e2e\public-site.spec.ts:7:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Adamawa MEB').first()
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Adamawa MEB').first()

```