import { NextRequest, NextResponse } from 'next/server';

interface Session {
  created_at: string;
  last_message: string | null;
  message_count: number;
  last_updated?: string;
}

// Store sessions in memory (in production, use Redis or database)
const sessions: Record<string, Session> = {};

const REPLIES = {
  "1": {
    text: "Here is a little highlight about flashgain but you can click on the link below to see more 👇👇",
    link: "https://flashgain9ja.money/abouttivexx",
    linkLabel: "About FlashGain",
    image: "/chatbot-img/image1.png",
    has_image: true,
  },
  "2": {
    text: "If you have created an account on helpinghands you can use the claim button on the site dashboard to claim 5,000 every 1 minutes👇👇👇",
    link: "https://flashgain9ja.money/dashboard",
    linkLabel: "Open Dashboard",
    image: "/chatbot-img/image2.png",
    has_image: true,
  },
  "3": {
    text: "If you have gotten up to 5 referrals and you have a minimum of 200k on your balance you can withdraw by clicking the withdraw button on the dashboard and following the instructions carefully",
    link: "https://flashgain9ja.money/withdraw",
    linkLabel: "Withdraw Guide",
    image: "/chatbot-img/image3.png",
    has_image: true,
  },
  "4": {
    text: "Click on the refer and earn button on the site and follow the instructions carefully",
    link: "https://flashgain9ja.money/refer",
    linkLabel: "Refer & Earn",
    images: ["/chatbot-img/image4.png", "/chatbot-img/image04.png"],
    has_image: true,
    has_multiple_images: true,
  },
  "5": {
    text: "The verification fee is due process to ensure identity documentation and to confirm you're not a Bot programmed to accumulate cash automatically.\n\nIn accordance with the CBN regulations, we have to verify a tax withholding payment from users.",
    link: "https://t.me/flashgain9janews/57",
    linkLabel: "Verification Info",
    images: ["/chatbot-img/image50.png"],
    has_image: true,
    has_multiple_images: true,
  },
} as const;

function processMessage(userInput: string, sessionId: string) {
  // Update session
  const session = sessions[sessionId] || {
    created_at: new Date().toISOString(),
    last_message: null,
    message_count: 0,
  };
  
  session.last_message = userInput;
  session.message_count += 1;
  session.last_updated = new Date().toISOString();
  sessions[sessionId] = session;

  // Clean input - remove extra spaces, convert to lowercase
  const cleanInput = userInput.toLowerCase().trim();

  // Check for menu command (1-5)
  if (cleanInput in REPLIES) {
    const replyData = REPLIES[cleanInput as keyof typeof REPLIES];
    
    // Handle both single and multiple images
    const isMultiple = 'images' in replyData && Array.isArray((replyData as any).images);

    if (isMultiple) {
      const result: any = {
        reply: replyData.text,
        hasImage: true,
        imageUrls: (replyData as any).images,
        followUpMenu: "Would you like to know about anything else?\n\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification."
      };
      if ((replyData as any).link) {
        result.link = (replyData as any).link;
        result.linkLabel = (replyData as any).linkLabel;
      }
      return result;
    } else {
      const singleImage = 'image' in replyData ? (replyData as any).image : null;
      const result: any = {
        reply: replyData.text,
        hasImage: Boolean((replyData as any).has_image),
        imageUrl: singleImage || undefined,
        followUpMenu: "Would you like to know about anything else?\n\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification."
      };
      if ((replyData as any).link) {
        result.link = (replyData as any).link;
        result.linkLabel = (replyData as any).linkLabel;
      }
      return result;
    }
  }

  // Check for common variations
  if (['about', 'flashgain', 'company', 'what is'].some(word => cleanInput.includes(word))) {
    const entry: any = REPLIES['1'];
    const base: any = entry.images && Array.isArray(entry.images)
      ? { reply: entry.text, hasImage: true, imageUrls: entry.images, followUpMenu: null }
      : { reply: entry.text, hasImage: Boolean(entry.has_image), imageUrl: entry.image, followUpMenu: null };
    if (entry.link) {
      base.link = entry.link;
      base.linkLabel = entry.linkLabel;
    }
    return base;
  }

  if (['earn', 'money', 'how to', 'income'].some(word => cleanInput.includes(word))) {
    const entry: any = REPLIES['2'];
    const base: any = entry.images && Array.isArray(entry.images)
      ? { reply: entry.text, hasImage: true, imageUrls: entry.images, followUpMenu: null }
      : { reply: entry.text, hasImage: Boolean(entry.has_image), imageUrl: entry.image, followUpMenu: null };
    if (entry.link) {
      base.link = entry.link;
      base.linkLabel = entry.linkLabel;
    }
    return base;
  }

  if (['withdraw', 'withdrawal', 'cash out', 'money out'].some(word => cleanInput.includes(word))) {
    const entry: any = REPLIES['3'];
    const base: any = entry.images && Array.isArray(entry.images)
      ? { reply: entry.text, hasImage: true, imageUrls: entry.images, followUpMenu: null }
      : { reply: entry.text, hasImage: Boolean(entry.has_image), imageUrl: entry.image, followUpMenu: null };
    if (entry.link) {
      base.link = entry.link;
      base.linkLabel = entry.linkLabel;
    }
    return base;
  }

  if (['refer', 'referral', 'link', 'invite', 'friend'].some(word => cleanInput.includes(word))) {
    const entry: any = REPLIES['4'];
    const base: any = entry.images && Array.isArray(entry.images)
      ? { reply: entry.text, hasImage: true, imageUrls: entry.images, followUpMenu: null }
      : { reply: entry.text, hasImage: Boolean(entry.has_image), imageUrl: entry.image, followUpMenu: null };
    if (entry.link) {
      base.link = entry.link;
      base.linkLabel = entry.linkLabel;
    }
    return base;
  }

  if (['verify', 'verification', 'kyc', 'identity', 'cbn'].some(word => cleanInput.includes(word))) {
    const entry: any = REPLIES['5'];
    const base: any = entry.images && Array.isArray(entry.images)
      ? { reply: entry.text, hasImage: true, imageUrls: entry.images, followUpMenu: null }
      : { reply: entry.text, hasImage: Boolean(entry.has_image), imageUrl: entry.image, followUpMenu: null };
    if (entry.link) {
      base.link = entry.link;
      base.linkLabel = entry.linkLabel;
    }
    return base;
  }

  // If input is "menu" or "help", show main menu
  if (['menu', 'help', 'options', 'start'].includes(cleanInput)) {
    return {
      reply: "What do you need help on⁉️\n\nPick 1 number below:\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification.",
      hasImage: false,
      imageUrl: null,
      followUpMenu: null
    };
  }

  // Default response for invalid input
  return {
    reply: "I didn't understand that. Please pick a number from the menu below:\n\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification.",
    hasImage: false,
    imageUrl: null,
    followUpMenu: null
  };
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    // Generate or use provided session ID
    const finalSessionId = sessionId || crypto.randomUUID();

    // Process the message
    const response = processMessage(message.trim(), finalSessionId);

    // Return response with session ID
    return NextResponse.json({
      ...response,
      sessionId: finalSessionId
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        reply: 'Sorry, I encountered an error. Please try again.'
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
