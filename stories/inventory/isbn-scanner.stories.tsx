/**
 * Storybook stories untuk ISBNScanner.
 *
 * States:
 * - Manual input mode
 * - Camera scanning (simulated)
 * - Result found
 * - Duplicate detection
 * - Error state
 */

import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ISBNScanner } from "../../src/components/app/inventory/isbn-scanner";

const meta: Meta<typeof ISBNScanner> = {
  title: "Inventory/ISBNScanner",
  component: ISBNScanner,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Computer vision scanner untuk ISBN barcode. Features: camera scanning, manual input, auto-lookup via OpenLibrary/Google Books, duplicate detection.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "500px", maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ISBNScanner>;

export const Default: Story = {
  args: {
    onFound: fn(),
    onDuplicate: fn(),
    onNotFound: fn(),
  },
};

export const WithCallbacks: Story = {
  args: {
    onFound: (data) => {
      console.log("Found:", data);
      alert(`Found: ${data.title}`);
    },
    onDuplicate: (book) => {
      console.log("Duplicate:", book);
      alert(`Duplicate: ${book.title}`);
    },
    onNotFound: (isbn) => {
      console.log("Not found:", isbn);
      alert(`ISBN ${isbn} not found in any database`);
    },
  },
};
