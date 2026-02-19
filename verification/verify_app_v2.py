from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000/schedule.html")

        # Handle QuickStart
        for _ in range(10):
            try:
                if page.get_by_role("button", name="Get Started").is_visible():
                    page.get_by_role("button", name="Get Started").click()
                    break
                if page.get_by_role("button", name="Next").is_visible():
                    page.get_by_role("button", name="Next").click()
                    page.wait_for_timeout(200)
            except:
                pass

        # 1. Config: Check Section input (Still present)
        page.get_by_role("button", name="Config").click()
        page.get_by_role("button", name="Positions").click()
        expect(page.get_by_placeholder("Section (e.g. A)")).to_be_visible()
        print("Config: Section input confirmed.")

        # 2. Rules: Check Renaming
        page.get_by_role("button", name="Rules").click()

        # Look for "Auditorium Relief Mode" instead of "Rotation Mode"
        # Find container
        container = page.locator("div.flex").filter(has_text="Auditorium Relief Mode").filter(has=page.locator("input[type=checkbox]")).first
        relief_checkbox = container.locator("input[type=checkbox]")

        expect(container).to_be_visible()
        relief_checkbox.check()

        # Check Slider "Max Relief %"
        expect(page.get_by_text("Max Relief % per Shift")).to_be_visible()
        print("Rules: Relief Mode enabled and slider correct.")

        # 3. Schedule: Check Reverted Rendering (No "ROTATING" badge)
        page.get_by_role("button", name="Schedule").click()

        expect(page.get_by_text("ROTATING")).not_to_be_visible()
        expect(page.get_by_text("ALL DAY").first).to_be_visible()
        print("Schedule: Reverted to ALL DAY badge.")

        page.screenshot(path="verification/auditorium_relief.png")
        print("Screenshot taken.")

        browser.close()

if __name__ == "__main__":
    run()
