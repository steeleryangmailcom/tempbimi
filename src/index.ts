import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { validateConfig } from "./config";
import { ContactInput, EnrichedContact } from "./types";
import { lookupAndEnrich } from "./rocketreach";
import { createHubSpotContacts } from "./hubspot";
import { displayResults, displayHubSpotResults } from "./display";
import { parseCsvFile } from "./csv";

const program = new Command();

program
  .name("enrich")
  .description(
    "Look up contacts by name/company, find LinkedIn profiles via RocketReach, and push to HubSpot"
  )
  .version("1.0.0")
  .option("--csv <file>", "Import contacts from a CSV file (columns: name, company)")
  .action(run);

async function promptForContacts(): Promise<ContactInput[]> {
  const contacts: ContactInput[] = [];
  let addMore = true;

  console.log(
    chalk.bold("\nEnter contacts to look up (name + company):\n")
  );

  while (addMore) {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Full name:",
        validate: (v: string) => (v.trim() ? true : "Name is required"),
      },
      {
        type: "input",
        name: "company",
        message: "Company name:",
        validate: (v: string) => (v.trim() ? true : "Company is required"),
      },
      {
        type: "confirm",
        name: "addMore",
        message: "Add another contact?",
        default: true,
      },
    ]);

    contacts.push({ name: answers.name.trim(), company: answers.company.trim() });
    addMore = answers.addMore;
  }

  return contacts;
}

async function run(options: { csv?: string }): Promise<void> {
  console.log(chalk.bold.cyan("\n=== LinkedIn + RocketReach Enrichment Tool ===\n"));

  // Validate API keys
  const configErrors = validateConfig();
  if (configErrors.length > 0) {
    console.log(chalk.red("Configuration errors:"));
    configErrors.forEach((e) => console.log(chalk.red(`  • ${e}`)));
    console.log(chalk.yellow("\nCopy .env.example to .env and fill in your API keys.\n"));
    process.exit(1);
  }

  // Get contacts from CSV or interactive prompt
  let contacts: ContactInput[];
  if (options.csv) {
    try {
      contacts = parseCsvFile(options.csv);
      console.log(chalk.green(`Loaded ${contacts.length} contacts from ${options.csv}`));
    } catch (err: any) {
      console.log(chalk.red(`Failed to read CSV: ${err.message}`));
      process.exit(1);
    }
  } else {
    contacts = await promptForContacts();
  }

  if (contacts.length === 0) {
    console.log(chalk.yellow("No contacts to process."));
    return;
  }

  // Enrich each contact
  console.log(chalk.cyan(`\nLooking up ${contacts.length} contact(s) via RocketReach...\n`));

  const results: EnrichedContact[] = [];
  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    process.stdout.write(
      `  [${i + 1}/${contacts.length}] ${contact.name} @ ${contact.company}...`
    );
    const result = await lookupAndEnrich(contact);
    results.push(result);

    if (result.error) {
      console.log(chalk.red(` Error`));
    } else if (result.linkedin.found) {
      console.log(chalk.green(` Found`));
    } else {
      console.log(chalk.yellow(` Not found`));
    }
  }

  // Display results table
  displayResults(results);

  // Filter to contacts that were successfully enriched
  const enrichedContacts = results.filter(
    (r) => r.linkedin.found && !r.error
  );

  if (enrichedContacts.length === 0) {
    console.log(chalk.yellow("\nNo enriched contacts available to push to HubSpot."));
    return;
  }

  // Ask which contacts to push to HubSpot
  const { pushToHubSpot } = await inquirer.prompt([
    {
      type: "confirm",
      name: "pushToHubSpot",
      message: `Push ${enrichedContacts.length} enriched contact(s) to HubSpot?`,
      default: false,
    },
  ]);

  if (!pushToHubSpot) {
    console.log(chalk.gray("\nSkipped HubSpot import."));
    return;
  }

  // Let user select which contacts to push
  if (enrichedContacts.length > 1) {
    const { selectedIndices } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedIndices",
        message: "Select contacts to add to HubSpot:",
        choices: enrichedContacts.map((c, i) => ({
          name: `${c.input.name} @ ${c.input.company}${
            c.enrichment?.current_title ? ` (${c.enrichment.current_title})` : ""
          }`,
          value: i,
          checked: true,
        })),
      },
    ]);

    if (selectedIndices.length === 0) {
      console.log(chalk.gray("\nNo contacts selected."));
      return;
    }

    const selected = selectedIndices.map((i: number) => enrichedContacts[i]);
    console.log(chalk.cyan(`\nPushing ${selected.length} contact(s) to HubSpot...\n`));
    const hubspotResults = await createHubSpotContacts(selected);
    displayHubSpotResults(selected, hubspotResults);
  } else {
    console.log(chalk.cyan("\nPushing contact to HubSpot...\n"));
    const hubspotResults = await createHubSpotContacts(enrichedContacts);
    displayHubSpotResults(enrichedContacts, hubspotResults);
  }
}

program.parse();
