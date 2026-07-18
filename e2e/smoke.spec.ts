import { expect, test } from "@playwright/test";

test("public product and registration entry points render", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Turn operational data/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create account" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
});
