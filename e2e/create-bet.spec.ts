import { expect, test } from "@playwright/test";

for (const participantCount of [2, 4]) {
  test(`creates and previews a ${participantCount}-person Bet`, async ({ page }) => {
    let submittedBody: Record<string, unknown> | undefined;
    await page.route("**/api/bets", async (route) => {
      submittedBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          publicId: "public-test",
          organizerUrl: "https://bets.example/organize/organizer-token",
          invitationUrls: Array.from(
            { length: participantCount - 1 },
            (_, index) => `https://bets.example/invite/token-${index + 1}`,
          ),
        }),
      });
    });

    await page.goto("/bets/new");
    await page.getByLabel("Title").fill("Coffee temperature dispute");
    await page.getByLabel("Exact question or premise").fill("Should coffee be served above 65°C?");
    await page
      .getByLabel("Context, criteria, assumptions, and exclusions")
      .fill("Judge based on safety, flavor, and common hospitality standards.");
    await page.getByLabel("Total participants").selectOption(String(participantCount));
    await page.getByLabel("Per-person nominal stake (USD)").fill("25");
    await page.getByLabel("Creator name").fill("Ada");
    await page.getByLabel("Concise Position").fill("Coffee should be served at or below 65°C.");
    await page
      .getByRole("textbox", { name: "Submission", exact: true })
      .fill("Serving at or below 65°C balances drinkability with burn prevention.");
    await page.getByLabel(/I consent to my name/).check();
    await page.getByLabel(/I understand that the stake is hypothetical/).check();
    await page.getByRole("button", { name: "Review Bet" }).click();

    await expect(page.getByText("This is the final preview")).toBeVisible();
    await expect(
      page.getByText(`$${(25 * participantCount).toLocaleString()} hypothetical pot`),
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm and create" }).click();

    await expect(page.getByText("Bet created.")).toBeVisible();
    await expect(page.locator(".link-box")).toHaveCount(participantCount);
    expect(submittedBody?.participantCount).toBe(participantCount);
    const creator = submittedBody?.creator as { name?: string } | undefined;
    expect(creator?.name).toBe("Ada");
  });
}

test("lets the creator edit instead of prematurely committing", async ({ page }) => {
  await page.goto("/bets/new");
  await page.getByLabel("Title").fill("A reversible preview");
  await page.getByLabel("Exact question or premise").fill("Is the preview final?");
  await page
    .getByLabel("Context, criteria, assumptions, and exclusions")
    .fill("Use the displayed form.");
  await page.getByLabel("Creator name").fill("Grace");
  await page.getByLabel("Concise Position").fill("The preview is not the commit.");
  await page
    .getByRole("textbox", { name: "Submission", exact: true })
    .fill("The explicit confirmation is the commit boundary.");
  await page.getByLabel(/I consent to my name/).check();
  await page.getByLabel(/I understand that the stake is hypothetical/).check();
  await page.getByRole("button", { name: "Review Bet" }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByLabel("Creator name")).toHaveValue("Grace");
});
