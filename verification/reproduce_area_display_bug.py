from playwright.sync_api import sync_playwright
import time

def run():
    print("Starting Playwright for Area Display Bug Reproduction...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            print("Navigating...")
            page.goto("http://localhost:8000/schedule.html", timeout=60000)

            # Setup state
            page.evaluate("localStorage.clear()")
            page.evaluate("localStorage.setItem('has_seen_quickstart', 'true')")
            page.evaluate("localStorage.setItem('dark_mode', 'false')")
            page.reload()
            page.wait_for_load_state("domcontentloaded")

            # 1. Add Dummy Person (for Congregation dropdown)
            print("Adding dummy person...")
            page.get_by_role("button", name="Roster").click()
            page.wait_for_selector("input[placeholder='Full Name']")
            add_form = page.locator("div.border").filter(has_text="Add New Personnel").last
            add_form.get_by_placeholder("Full Name").fill("Test Person")
            add_form.get_by_placeholder("Congregation").fill("TestCong")
            add_form.get_by_role("button", name="Add Person").click()
            time.sleep(0.5)

            # 2. Go to Config
            print("Going to Config...")
            page.get_by_role("button", name="Config").click()
            time.sleep(0.5)

            # 3. Create Area with Restriction
            print("Creating Area 'RestrictedZone'...")

            # Scope to the Add Area container.
            # It's the first "bg-gray-50" block in the Config view (when Areas tab is active)
            config_panel = page.locator(".glass-panel").last
            add_area_block = config_panel.locator(".bg-gray-50").first

            add_area_block.locator("input[placeholder='ID (e.g. parking)']").fill("restricted_zone")
            add_area_block.locator("input[placeholder='Name (e.g. Parking Lot)']").fill("Restricted Zone")

            # Select Restriction
            # Look for the "Restriction:" label I added?
            # Wait, did I add a label to the Add form?
            # In the patch:
            # <div className="mt-2 bg-white p-2 rounded border dark:bg-slate-700 dark:border-slate-600">
            #    <span className="text-xs font-bold text-gray-500 uppercase mr-2 dark:text-gray-400">Restriction:</span>
            #    {renderConstraintSelector(areaForm, setAreaForm, false)}
            # </div>
            # YES, I added it.

            add_area_block.locator("select").first.select_option("congregation")
            time.sleep(0.2)
            add_area_block.locator("select").nth(1).select_option("TestCong")

            page.get_by_role("button", name="Add Area").click()
            time.sleep(0.5)

            # 4. Verify Display (Immediate)
            print("Verifying immediate display...")
            row = page.locator("tr").filter(has_text="restricted_zone")
            if row.count() == 0:
                print("FAILURE: Area row not found.")
                return

            text = row.inner_text()
            print(f"Row text: {text}")

            if "Cong: TestCong" in text:
                print("SUCCESS: Restriction displayed after Create.")
            else:
                print("FAILURE: Restriction NOT displayed after Create.")

            # 5. Edit Area -> Change Restriction
            print("Editing Area...")
            row.locator("button.text-blue-500").click()

            # Wait for edit inputs
            # Change value to something else? Or just save?
            # User said "isnt displaying it in the area anymore after you click save".
            # This implies they edited (or just saved) and it vanished.

            print("Saving Area (No changes)...")
            row.locator("button.text-green-600").click()
            time.sleep(0.5)

            text_after = row.inner_text()
            print(f"Row text after save: {text_after}")

            if "Cong: TestCong" in text_after:
                print("SUCCESS: Restriction displayed after Save.")
            else:
                print("FAILURE: Restriction disappeared after Save.")

        except Exception as e:
            print(f"Error: {e}")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
