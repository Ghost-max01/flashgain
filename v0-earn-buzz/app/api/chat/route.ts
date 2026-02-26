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
    text: "Here is a little highlight about flashgain but you can click on the link below to see more 👇👇\nhttps://flashgain9ja.money/abouttivexx",
    image: "/chatbot-img/image1.png",
    has_image: true
  },
  "2": {
    text: "If you have created an account on helpinghands you can use the claim button on the site dashboard to claim 1000 every 1 minutes👇👇👇\nhttps://flashgain9ja.money/dashboard",
    image: "/chatbot-img/image2.png",
    has_image: true
  },
  "3": {
    text: "If you have gotten up to 5 referrals and you have a minimum of 200k on your balance you can withdraw by clicking the withdraw button on the dashboard and following the instructions carefully \nhttps://flashgain9ja.money/withdraw",
    image: "/chatbot-img/image3.png",
    has_image: true
  },
  "4": {
    text: "Click on the refer and earn button on the site and follow the instructions carefully",
    image: "/chatbot-img/image4.png",
    has_image: true
  },
  "5": {
    text: "The verification fee is due process to ensure identity documentation and to confirm you're not a Bot programmed to accumulate cash automatically.\n\nIn accordance with the CBN regulations, we have to verify a tax withholding payment from users \nhttps://t.me/flashgain9janews/57",
    images: ["/chatbot-img/image5.png", "/chatbot-img/image05.png"],
    has_multiple_images: true
  }
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
    const isMultiple = 'images' in replyData && replyData.has_multiple_images;
    
    if (isMultiple) {
      return {
        reply: replyData.text,
        hasImage: true,
        imageUrls: replyData.images,
        followUpMenu: "Would you like to know about anything else?\n\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification."
      };
    } else {
      const singleImage = 'image' in replyData ? replyData.image : null;
      return {
        reply: replyData.text,
        hasImage: replyData.has_image,
        imageUrl: singleImage || undefined,
        followUpMenu: "Would you like to know about anything else?\n\n1. About FlashGain\n2. How To Earn\n3. Withdrawals\n4. Refferal/link\n5. Verification."
      };
    }
  }

  // Check for common variations
  if (['about', 'flashgain', 'company', 'what is'].some(word => cleanInput.includes(word))) {
    return {
      reply: REPLIES['1'].text,
      hasImage: true,
      imageUrl: REPLIES['1'].image,
      followUpMenu: null
    };
  }

  if (['earn', 'money', 'how to', 'income'].some(word => cleanInput.includes(word))) {
    return {
      reply: REPLIES['2'].text,
      hasImage: true,
      imageUrl: REPLIES['2'].image,
      followUpMenu: null
    };
  }

  if (['withdraw', 'withdrawal', 'cash out', 'money out'].some(word => cleanInput.includes(word))) {
    return {
      reply: REPLIES['3'].text,
      hasImage: true,
      imageUrl: REPLIES['3'].image,
      followUpMenu: null
    };
  }

  if (['refer', 'referral', 'link', 'invite', 'friend'].some(word => cleanInput.includes(word))) {
    return {
      reply: REPLIES['4'].text,
      hasImage: true,
      imageUrl: REPLIES['4'].image,
      followUpMenu: null
    };
  }

  if (['verify', 'verification', 'kyc', 'identity', 'cbn'].some(word => cleanInput.includes(word))) {
    return {
      reply: REPLIES['5'].text,
      hasImage: true,
      imageUrls: REPLIES['5'].images,
      followUpMenu: null
    };
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
