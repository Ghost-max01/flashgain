"use client";

// Shared FlashGain Support automated replies — single source so the
// dashboard popup (LiveChat) and the Chats page give the SAME answers
// as /api/chat, even offline.

export const SUPPORT_MENU =
  "What do you need help on⁉️\n\nPick 1 number below:\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification.";

export const SUPPORT_GREETING =
  "Hello good day\n\nWhat do you need help on⁉️\n\nPick 1 number below:\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification.";

export interface SupportReply {
  text: string;
  link?: string;
  linkLabel?: string;
}

const REPLIES: Record<string, SupportReply> = {
  "1": {
    text: "Here is a little highlight about flashgain but you can click on the link below to see more 👇👇",
    link: "https://flashgain9ja.money/abouttivexx",
    linkLabel: "About FlashGain",
  },
  "2": {
    text: "If you have created an account on FlashGain you can use the claim button on the site dashboard to claim 2,000 every 1 minutes👇👇👇",
    link: "https://flashgain9ja.money/dashboard",
    linkLabel: "Open Dashboard",
  },
  "3": {
    text: "If you have gotten up to 5 referrals and you have a minimum of 200k on your balance you can withdraw by clicking the withdraw button on the dashboard and following the instructions carefully",
    link: "https://flashgain9ja.money/withdraw",
    linkLabel: "Withdraw Guide",
  },
  "4": {
    text: "Click on the refer and earn button on the site and follow the instructions carefully",
    link: "https://flashgain9ja.money/refer",
    linkLabel: "Refer & Earn",
  },
  "5": {
    text: "The verification fee is due process to ensure identity documentation and to confirm you're not a Bot programmed to accumulate cash automatically.\n\nIn accordance with the CBN regulations, we have to verify a tax withholding payment from users.",
    link: "https://t.me/flashgain9janews/57",
    linkLabel: "Verification Info",
  },
};

export function getFlashgainSupportReply(input: string): SupportReply & { followUpMenu: string | null } {
  const clean = (input || "").toLowerCase().trim();

  if (REPLIES[clean]) {
    const r = REPLIES[clean];
    return {
      text: r.text,
      link: r.link,
      linkLabel: r.linkLabel,
      followUpMenu: "Would you like to know about anything else?\n\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification.",
    };
  }
  if (["about", "flashgain", "company", "what is"].some((w) => clean.includes(w))) {
    return { ...REPLIES["1"], followUpMenu: null };
  }
  if (["earn", "money", "how to", "income", "claim"].some((w) => clean.includes(w))) {
    return { ...REPLIES["2"], followUpMenu: null };
  }
  if (["withdraw", "cash out", "money out", "payout"].some((w) => clean.includes(w))) {
    return { ...REPLIES["3"], followUpMenu: null };
  }
  if (["refer", "link", "invite", "friend"].some((w) => clean.includes(w))) {
    return { ...REPLIES["4"], followUpMenu: null };
  }
  if (["verify", "verification", "kyc", "identity", "cbn", "fee"].some((w) => clean.includes(w))) {
    return { ...REPLIES["5"], followUpMenu: null };
  }
  if (["menu", "help", "options", "start", "hi", "hello", "hey", "good"].includes(clean)) {
    return { text: SUPPORT_MENU, followUpMenu: null };
  }
  return {
    text: "I didn't understand that. Please pick a number from the menu below:\n\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification.",
    followUpMenu: null,
  };
}
