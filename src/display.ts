import chalk from "chalk";
import Table from "cli-table3";
import { EnrichedContact, HubSpotCreateResult } from "./types";

/**
 * Display enrichment results in a formatted table.
 */
export function displayResults(contacts: EnrichedContact[]): void {
  const table = new Table({
    head: [
      chalk.white("#"),
      chalk.white("Name"),
      chalk.white("Company"),
      chalk.white("LinkedIn"),
      chalk.white("Title"),
      chalk.white("Email"),
      chalk.white("Phone"),
      chalk.white("Status"),
    ],
    colWidths: [4, 20, 18, 35, 22, 28, 16, 10],
    wordWrap: true,
  });

  contacts.forEach((c, i) => {
    const enrichment = c.enrichment;
    const email =
      enrichment?.emails?.[0]?.email || "";
    const phone =
      enrichment?.phones?.[0]?.number || "";
    const title = enrichment?.current_title || "";

    let status: string;
    if (c.error) {
      status = chalk.red("Error");
    } else if (c.linkedin.found && enrichment) {
      status = chalk.green("Found");
    } else if (c.linkedin.found) {
      status = chalk.yellow("Partial");
    } else {
      status = chalk.red("Not Found");
    }

    table.push([
      String(i + 1),
      c.input.name,
      c.input.company,
      c.linkedin.linkedinUrl || chalk.gray("—"),
      title || chalk.gray("—"),
      email || chalk.gray("—"),
      phone || chalk.gray("—"),
      status,
    ]);
  });

  console.log("\n" + chalk.bold("Enrichment Results:"));
  console.log(table.toString());

  const found = contacts.filter((c) => c.linkedin.found).length;
  const enriched = contacts.filter((c) => c.enrichment).length;
  const errors = contacts.filter((c) => c.error).length;

  console.log(
    `\n${chalk.bold("Summary:")} ${contacts.length} contacts processed, ` +
      `${chalk.green(String(found))} LinkedIn profiles found, ` +
      `${chalk.green(String(enriched))} fully enriched, ` +
      `${chalk.red(String(errors))} errors`
  );
}

/**
 * Display HubSpot push results.
 */
export function displayHubSpotResults(
  contacts: EnrichedContact[],
  results: HubSpotCreateResult[]
): void {
  console.log("\n" + chalk.bold("HubSpot Import Results:"));

  results.forEach((r, i) => {
    const name = contacts[i].input.name;
    if (r.success) {
      console.log(
        chalk.green(`  ✓ ${name} — created (ID: ${r.contactId})`)
      );
    } else {
      console.log(chalk.red(`  ✗ ${name} — ${r.error}`));
    }
  });

  const succeeded = results.filter((r) => r.success).length;
  console.log(
    `\n  ${chalk.bold(String(succeeded))}/${results.length} contacts added to HubSpot`
  );
}
