"use client";

import { useState } from "react";
import { Checkbox } from "@/components/checkbox";
import type { PaymentMethod } from "@/lib/types";

// The club can't pay out via PayID yet — only BSB + account number for now.
// Flip back to true once that capability exists.
const PAYID_ENABLED = false;

export function PaymentMethodFields({
  defaultMethod = "bank_transfer",
  defaultPayid = "",
  defaultBsb = "",
  defaultAccountNumber = "",
  defaultAccountName = "",
  showSaveCheckbox = false,
  defaultSave = false,
  fieldBg = "bg-surface",
}: {
  defaultMethod?: PaymentMethod;
  defaultPayid?: string;
  defaultBsb?: string;
  defaultAccountNumber?: string;
  defaultAccountName?: string;
  showSaveCheckbox?: boolean;
  defaultSave?: boolean;
  fieldBg?: string;
}) {
  const [method, setMethod] = useState<PaymentMethod>(
    PAYID_ENABLED ? defaultMethod : "bank_transfer"
  );
  const inputClass = `rounded-md border border-line ${fieldBg} px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60`;

  return (
    <fieldset className="mt-1 rounded-lg border border-line p-4">
      <legend className="px-1 text-sm font-medium">Reimbursement payout</legend>
      <p className="text-sm text-ink-soft">
        Where we&apos;ll send the money once your claim is approved. Only you
        and the payment manager can see this.
      </p>

      {PAYID_ENABLED ? (
        <div className="mt-3 flex gap-4 text-sm font-medium">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="payment_method"
              value="payid"
              checked={method === "payid"}
              onChange={() => setMethod("payid")}
              className="accent-accent"
            />
            PayID
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="payment_method"
              value="bank_transfer"
              checked={method === "bank_transfer"}
              onChange={() => setMethod("bank_transfer")}
              className="accent-accent"
            />
            BSB + account number
          </label>
        </div>
      ) : (
        <input type="hidden" name="payment_method" value="bank_transfer" />
      )}

      {PAYID_ENABLED && method === "payid" ? (
        <label className="mt-3 flex flex-col gap-1 text-sm font-medium">
          PayID
          <input
            name="payid"
            required
            placeholder="Email or phone number"
            defaultValue={defaultPayid}
            className={inputClass}
          />
        </label>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Account name
            <input
              name="account_name"
              required
              placeholder="Name on the account"
              defaultValue={defaultAccountName}
              className={inputClass}
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-col gap-1 text-sm font-medium sm:w-32">
              BSB
              <input
                name="bsb"
                required
                inputMode="numeric"
                pattern="\d{3}-?\d{3}"
                placeholder="e.g. 063-000"
                defaultValue={defaultBsb}
                className={`${inputClass} w-full font-mono`}
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
              Account number
              <input
                name="account_number"
                required
                inputMode="numeric"
                pattern="\d{6,9}"
                maxLength={9}
                placeholder="6 to 9 digits"
                defaultValue={defaultAccountNumber}
                className={`${inputClass} w-full font-mono`}
              />
            </label>
          </div>
        </div>
      )}

      {showSaveCheckbox && (
        <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <Checkbox name="save_bank_details" defaultChecked={defaultSave} />
          Save these details for next time
        </label>
      )}
    </fieldset>
  );
}
