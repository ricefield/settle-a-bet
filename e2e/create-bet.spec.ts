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
    await page.getByLabel("The question").fill("Should coffee be served above 65°C?");
    await page
      .getByLabel("Ground rules")
      .fill("Judge based on safety, flavor, and common hospitality standards.");
    await page.getByLabel("How many people?").selectOption(String(participantCount));
    await page.getByLabel("Pretend stake per person").fill("25");
    await page.getByLabel("Your name").fill("Ada");
    await page.getByLabel("Your answer").fill("Coffee should be served at or below 65°C.");
    await page
      .getByRole("textbox", { name: "Make your case", exact: true })
      .fill("Serving at or below 65°C balances drinkability with burn prevention.");
    await page.getByLabel(/My name, answer/).check();
    await page.getByLabel(/This stake is just for fun/).check();
    await page.getByRole("button", { name: "Review bet" }).click();

    await expect(page.getByText(/Last look/)).toBeVisible();
    await expect(
      page.getByText(`$${(25 * participantCount).toLocaleString()} pretend pot`, { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Create bet" }).click();

    await expect(page.getByText("Your bet is live.")).toBeVisible();
    await expect(page.locator(".link-box")).toHaveCount(participantCount);
    expect(submittedBody?.participantCount).toBe(participantCount);
    const creator = submittedBody?.creator as { name?: string } | undefined;
    expect(creator?.name).toBe("Ada");
  });
}

test("lets the creator edit instead of prematurely committing", async ({ page }) => {
  await page.goto("/bets/new");
  await page.getByLabel("Title").fill("A reversible preview");
  await page.getByLabel("The question").fill("Is the preview final?");
  await page.getByLabel("Ground rules").fill("Use the displayed form.");
  await page.getByLabel("Your name").fill("Grace");
  await page.getByLabel("Your answer").fill("The preview is not the commit.");
  await page
    .getByRole("textbox", { name: "Make your case", exact: true })
    .fill("The explicit confirmation is the commit boundary.");
  await page.getByLabel(/My name, answer/).check();
  await page.getByLabel(/This stake is just for fun/).check();
  await page.getByRole("button", { name: "Review bet" }).click();
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByLabel("Your name")).toHaveValue("Grace");
});
