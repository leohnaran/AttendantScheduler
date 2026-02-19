
from playwright.sync_api import sync_playwright, expect

def verify_schedule_app(page):
    # Navigate to the locally served file
    page.goto("http://localhost:8000/schedule.html")

    # 1. Verify Title
    expect(page).to_have_title("Secure Circuit Assembly Scheduler")

    # 2. Verify Core Views Load
    # Check for the header
    expect(page.locator("h1")).to_contain_text("Circuit Attendant Scheduler")

    # Check for default view (Schedule Grid)
    expect(page.locator("h2").filter(has_text="Schedule Grid")).to_be_visible()

    # 3. Verify Refactored Data (Positions & Areas)
    # Since we refactored to use state, we check if 'Auditorium' (Area) and 'Pos 12' (Position) are still rendered.
    expect(page.get_by_role("cell", name="Auditorium", exact=True)).to_be_visible()
    expect(page.get_by_role("cell", name="Pos 12 (Sect A - Key Man)")).to_be_visible()

    # 4. Interact with Roster View to verify props passing
    page.get_by_role("button", name="Roster").click()
    expect(page.locator("h2").filter(has_text="Personnel Roster")).to_be_visible()

    # Verify Roster Form has checkboxes corresponding to Areas (dynamic generation)
    # Using exact=True to avoid confusion with "Backstage / South Auditorium"
    expect(page.get_by_label("Auditorium", exact=True)).to_be_visible()
    expect(page.get_by_label("Exterior")).to_be_visible()

    # 6. Verify New Buttons in Schedule View
    page.get_by_role("button", name="Schedule").click()
    expect(page.get_by_role("button", name="Fill in Unassigned")).to_be_visible()
    expect(page.get_by_role("button", name="Fix Conflicts")).to_be_visible()

    # 7. Verify Stats View Column
    page.get_by_role("button", name="Time Stats").click()
    # Wait for the view change
    expect(page.locator("h2").filter(has_text="Time Statistics")).to_be_visible()
    expect(page.get_by_role("columnheader", name="Assignments")).to_be_visible()

    # 8. Screenshot
    page.screenshot(path="verification_screenshot.png", full_page=True)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_schedule_app(page)
            print("Verification script passed.")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="error_screenshot.png")
        finally:
            browser.close()
