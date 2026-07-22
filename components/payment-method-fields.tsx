"use client";

import { useState } from "react";
import type { PaymentMethod } from "@/lib/types";

export function PaymentMethodFields({
  defaultMethod = "bank_transfer",
  defaultPayid = "",
  defaultBsb = "",
  defaultAccountNumber = "",
  showSaveCheckbox = false,
  defaultSave = false,
  fieldBg = "bg-surface",
}: {
  defaultMethod?: PaymentMethod;
  defaultPayid?: string;
  defaultBsb?: string;
  defaultAccountNumber?: string;
  showSaveCheckbox?: boolean;
  defaultSave?: boolean;
  fieldBg?: string;
}) {
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod);
  const inputClass = `rounded-md border border-line ${fieldBg} px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60`;

  return (
    <fieldset className="mt-1 rounded-lg border border-line p-4">
      <legend className="px-1 text-sm font-medium">Reimbursement payout</legend>
      <p className="text-sm text-ink-soft">
        Where we&apos;ll send the money once your claim is approved. Only you
        and the payment manager can see this.
      </p>

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

      {method === "payid" ? (
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
        <div className="mt-3 flex gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            BSB
            <input
              name="bsb"
              required
              inputMode="numeric"
              pattern="\d{3}-?\d{3}"
              placeholder="e.g. 063-000"
              defaultValue={defaultBsb}
              className={`${inputClass} font-mono`}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Account number
            <input
              name="account_number"
              required
              inputMode="numeric"
              pattern="\d{4,10}"
              placeholder="4 to 10 digits"
              defaultValue={defaultAccountNumber}
              className={`${inputClass} font-mono`}
            />
          </label>
        </div>
      )}

      {showSaveCheckbox && (
        <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="save_bank_details"
            defaultChecked={defaultSave}
            className="accent-accent"
          />
          Save these details for next time
        </label>
      )}
    </fieldset>
  );
}
