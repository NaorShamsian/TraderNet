const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

// Load env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const Group = require("../models/Group");
const Post = require("../models/Post");
const Message = require("../models/Message");

const seedDatabase = async () => {
  try {
    console.log("Connecting to database for seeding...");
    const uri = process.env.MONGO_URI;
    try {
      console.log("Attempting to connect to primary Atlas MongoDB...");
      const conn = await mongoose.connect(uri);
      console.log(`Connected to primary database: ${conn.connection.host}`);
    } catch (atlasErr) {
      console.warn(`Primary Atlas database unreachable: ${atlasErr.message}`);
      console.log("Attempting automatic fallback to local MongoDB instance (127.0.0.1)...");
      const conn = await mongoose.connect("mongodb://127.0.0.1:27017/tradernet");
      console.log(`Connected to local database: ${conn.connection.host}`);
    }

    // Clean old data
    console.log("Wiping existing database records...");
    await User.deleteMany({});
    await Group.deleteMany({});
    await Post.deleteMany({});
    await Message.deleteMany({});
    console.log("Database wiped clean ✓");

    // 1. Create Users
    console.log("Creating premium mock users...");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);

    const usersData = [
      {
        fullName: "Alex Mercer",
        email: "trader1@trader.net",
        username: "alex_mercer",
        password: passwordHash,
        role: "user",
        bio: "Crypto Scalper & Technical Analyst. Always looking for high-probability setups.",
        phoneNumber: "+15550191",
      },
      {
        fullName: "Sophia Lin",
        email: "trader2@trader.net",
        username: "sophia_lin",
        password: passwordHash,
        role: "user",
        bio: "Swing trader focused on tech stocks, options, and trend breakouts.",
        phoneNumber: "+15550192",
      },
      {
        fullName: "Marcus Aurelius",
        email: "trader3@trader.net",
        username: "marcus_trades",
        password: passwordHash,
        role: "user",
        bio: "Macro economic strategist. Focused on gold, commodities, and bond yields.",
        phoneNumber: "+15550193",
      },
      {
        fullName: "Elena Rostova",
        email: "trader4@trader.net",
        username: "elena_r",
        password: passwordHash,
        role: "user",
        bio: "Forex daytrader & algorithmic enthusiast. Scalping EUR/USD and GBP/JPY.",
        phoneNumber: "+15550194",
      },
      {
        fullName: "Liam O'Connor",
        email: "crypto_whale@trader.net",
        username: "crypto_whale",
        password: passwordHash,
        role: "user",
        bio: "Bitcoin maximalist and blockchain venture capitalist. Position size is key.",
        phoneNumber: "+15550196",
      },
      {
        fullName: "Isabella Rossi",
        email: "options_queen@trader.net",
        username: "options_queen",
        password: passwordHash,
        role: "user",
        bio: "Specializing in options spreads, LEAPs, and high-implied-volatility plays.",
        phoneNumber: "+15550197",
      },
      {
        fullName: "Arthur Pendelton",
        email: "dividend_king@trader.net",
        username: "dividend_king",
        password: passwordHash,
        role: "user",
        bio: "Long-term compounder. Focused on high-yielding blue chips and REITs.",
        phoneNumber: "+15550198",
      },
      {
        fullName: "Yuki Tanaka",
        email: "quant_coder@trader.net",
        username: "quant_coder",
        password: passwordHash,
        role: "user",
        bio: "Python quantitative developer. Automating stock options and statistical arbitrage.",
        phoneNumber: "+15550199",
      },
      {
        fullName: "Carlos Mendez",
        email: "bull_runner@trader.net",
        username: "bull_runner",
        password: passwordHash,
        role: "user",
        bio: "Momentum breakout trader. Trading small cap growth stocks and hyper-scalping.",
        phoneNumber: "+15550200",
      },
      {
        fullName: "Sarah Jenkins",
        email: "bear_tamer@trader.net",
        username: "bear_tamer",
        password: passwordHash,
        role: "user",
        bio: "Hedge fund analyst specializing in short-selling, tail-risk, and market hedges.",
        phoneNumber: "+15550201",
      },
      {
        fullName: "Michael Chang",
        email: "macro_mike@trader.net",
        username: "macro_mike",
        password: passwordHash,
        role: "user",
        bio: "Global macro economist. Analyzing Fed policies, CPI data, and currency pairs.",
        phoneNumber: "+15550202",
      },
      {
        fullName: "TraderNet Administrator",
        email: "admin@trader.net",
        username: "admin",
        password: passwordHash,
        role: "admin",
        bio: "Official system administrator of TraderNet.",
        phoneNumber: "+15550195",
      },
    ];

    const users = await User.insertMany(usersData);
    console.log(`Created ${users.length} users successfully ✓`);

    const alex = users[0];
    const sophia = users[1];
    const marcus = users[2];
    const elena = users[3];
    const liam = users[4];
    const isabella = users[5];
    const arthur = users[6];
    const yuki = users[7];
    const carlos = users[8];
    const sarah = users[9];
    const mike = users[10];
    const admin = users[11];

    // 2. Create Groups
    console.log("Creating groups...");
    const groupsData = [
      {
        name: "Crypto Bulls",
        description: "Official hub for crypto market analysis, altcoin discussions, and blockchain trends.",
        topic: "Crypto",
        privacy: "public",
        creator: alex._id,
        admin: alex._id,
        members: [alex._id, sophia._id, elena._id, liam._id, yuki._id],
        pendingRequests: [],
      },
      {
        name: "WallStreet Bets Hub",
        description: "High-risk swing plays, stock options, weekly earnings breakouts, and market news.",
        topic: "Stocks",
        privacy: "public",
        creator: sophia._id,
        admin: sophia._id,
        members: [sophia._id, alex._id, marcus._id, isabella._id, carlos._id, sarah._id],
        pendingRequests: [],
      },
      {
        name: "Forex Masters",
        description: "Elite foreign exchange room covering currency pairs, central bank interest rates, and macro trends.",
        topic: "Forex",
        privacy: "private",
        creator: elena._id,
        admin: elena._id,
        members: [elena._id, alex._id, mike._id, yuki._id],
        pendingRequests: [sophia._id, marcus._id],
      },
      {
        name: "Gold & Commodities",
        description: "Safe-haven asset discussions, physical precious metals, oil futures, and hedging strategies.",
        topic: "Commodities",
        privacy: "private",
        creator: marcus._id,
        admin: marcus._id,
        members: [marcus._id, sarah._id, mike._id],
        pendingRequests: [elena._id],
      },
      {
        name: "Tech Growth Investors",
        description: "Focusing on SaaS, AI startups, semiconductor giants, and high beta disruptors.",
        topic: "Stocks",
        privacy: "public",
        creator: carlos._id,
        admin: carlos._id,
        members: [carlos._id, sophia._id, isabella._id, yuki._id, arthur._id],
        pendingRequests: [],
      },
      {
        name: "Options Strategies & LEAPs",
        description: "Credit spreads, iron condors, wheel strategy, and LEAP calls discussion room.",
        topic: "Options",
        privacy: "public",
        creator: isabella._id,
        admin: isabella._id,
        members: [isabella._id, sophia._id, yuki._id, sarah._id, carlos._id],
        pendingRequests: [],
      },
      {
        name: "Algorithmic & Quant Trading",
        description: "Python, PineScript, backtesting methodologies, execution speed, APIs, and machine learning models.",
        topic: "Quant",
        privacy: "public",
        creator: yuki._id,
        admin: yuki._id,
        members: [yuki._id, alex._id, elena._id, sophia._id, liam._id],
        pendingRequests: [],
      },
      {
        name: "Dividend Income Club",
        description: "Steady compounders, cash flow generators, blue chips, REITs, and retirement wealth accumulation.",
        topic: "Dividend",
        privacy: "public",
        creator: arthur._id,
        admin: arthur._id,
        members: [arthur._id, marcus._id, sarah._id, mike._id],
        pendingRequests: [],
      },
    ];

    const groups = await Group.insertMany(groupsData);
    console.log(`Created ${groups.length} groups successfully ✓`);

    const cryptoBulls = groups[0];
    const wsbHub = groups[1];
    const forexMasters = groups[2];
    const goldCommodities = groups[3];
    const techGrowth = groups[4];
    const optionsRoom = groups[5];
    const quantRoom = groups[6];
    const dividendRoom = groups[7];

    // 3. Create Posts
    console.log("Creating posts with comments and likes...");
    const postsData = [
      // Global feed posts
      {
        user: alex._id,
        content: "Just bought the breakout on BTC! The support at $65k is holding incredibly well on high volume. Next major target is the local resistance at $72k! 🚀📈 Let me know what you guys think.",
        image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600",
        group: null,
        likes: [sophia._id, marcus._id, liam._id, yuki._id],
        tags: ["BTC", "Crypto", "Breakout"],
        comments: [
          {
            user: sophia._id,
            text: "Agreed! Look at that MACD cross on the 4H chart. Looks super strong.",
          },
          {
            user: marcus._id,
            text: "Be careful of a liquidity sweep below $64.2k before the real pump.",
          },
          {
            user: liam._id,
            text: "Bitcoin spot ETFs are seeing net inflows. This support is real.",
          },
        ],
      },
      {
        user: sophia._id,
        content: "TSLA is forming a beautiful double bottom pattern on the daily chart. Watch for a decisive breakout above the neckline at $220. Immediate targets are $245 and $260. 📈🚘",
        image: "https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600",
        group: null,
        likes: [alex._id, carlos._id],
        tags: ["TSLA", "Stocks", "DoubleBottom"],
        comments: [
          {
            user: alex._id,
            text: "Outstanding analysis! RSI is also showing a positive divergence. I am going long.",
          },
          {
            user: carlos._id,
            text: "Volume profile shows heavy accumulation here. I'm in!",
          },
        ],
      },
      {
        user: marcus._id,
        content: "Macro trends update: Gold has just crossed $2,420/oz! As central banks continue to print and hedge inflation, precious metals are showing ultimate resilience. A gold standard mindset is key. 🏆💰",
        image: "https://images.unsplash.com/photo-1610374792793-f016b77ca51a?w=600",
        group: null,
        likes: [alex._id, sophia._id, elena._id, mike._id, sarah._id],
        tags: ["Gold", "Commodities", "Macro"],
        comments: [
          {
            user: mike._id,
            text: "Yield curve inversion is also warning us. Precious metals are the safest place right now.",
          },
          {
            user: sarah._id,
            text: "Added 10% more allocation to gold mining equities. Leverage is nice.",
          },
        ],
      },
      {
        user: isabella._id,
        content: "Options market is pricing in a massive move for NVDA earnings. Implied Volatility (IV) is at 85%! I've opened a Bull Put Spread (sell $120 put, buy $110 put) to collect premium while remaining bullish. 🛡️🔥",
        image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600",
        group: null,
        likes: [sophia._id, yuki._id, carlos._id],
        tags: ["NVDA", "Options", "Earnings", "ThetaGang"],
        comments: [
          {
            user: yuki._id,
            text: "Nice theta play. Selling the IV crush post-earnings is highly profitable.",
          },
          {
            user: carlos._id,
            text: "I just bought straight calls, let's go NVDA! 🚀",
          },
        ],
      },
      {
        user: arthur._id,
        content: "Dividend portfolio milestone: Just received my monthly payout from Realty Income (O) and SCHD. Reinvested everything immediately. Compound interest is the 8th wonder of the world. 💸🌳",
        image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600",
        group: null,
        likes: [marcus._id, sarah._id],
        tags: ["PassiveIncome", "Dividends", "SCHD", "REITs"],
        comments: [
          {
            user: marcus._id,
            text: "Slow and steady wins the race. Beats trading stress any day.",
          },
          {
            user: sarah._id,
            text: "What's your current yield on cost?",
          },
        ],
      },

      // Crypto Bulls group posts
      {
        user: liam._id,
        content: "On-chain data analysis: Over 100,000 BTC have been moved off exchanges into cold storage this week. Liquid supply is evaporating. Supply shock incoming! 🐋❄️",
        image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600",
        group: cryptoBulls._id,
        likes: [alex._id, yuki._id],
        tags: ["Bitcoin", "OnChain", "SupplyShock"],
        comments: [
          {
            user: alex._id,
            text: "This is major. Supply squeeze combined with ETF demand is going to launch us.",
          },
        ],
      },
      {
        user: alex._id,
        content: "Ethereum is looking extremely primed inside this symmetrical triangle. Staking ratios are at an all-time high of 28%, meaning less supply on exchanges. Bullish target: $3,800. 💎",
        image: "",
        group: cryptoBulls._id,
        likes: [elena._id, liam._id],
        tags: ["ETH", "Crypto"],
        comments: [
          {
            user: elena._id,
            text: "I am building a long bag here too. Symmetrical triangles breakout with high momentum.",
          },
        ],
      },

      // WallStreet Bets Hub posts
      {
        user: carlos._id,
        content: "PLTR breakout is official! Broke past the $30 resistance on 2x average volume. Next stop is $38. I'm holding 500 shares and June $35 calls! Who's in this ride? 🚀🤖",
        image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600",
        group: wsbHub._id,
        likes: [sophia._id, isabella._id],
        tags: ["PLTR", "Breakout", "YOLO"],
        comments: [
          {
            user: sophia._id,
            text: "The AI momentum is insane. I'm trailing my stop loss at $29.",
          },
        ],
      },
      {
        user: sophia._id,
        content: "Earnings season option play: I am going heavy on TSLA weekly calls ahead of their Wednesday report. High risk, high reward! 🎰🚀",
        image: "",
        group: wsbHub._id,
        likes: [alex._id, marcus._id, carlos._id],
        tags: ["TSLA", "Options", "Earnings"],
        comments: [],
      },

      // Private Forex Masters post
      {
        user: elena._id,
        content: "EUR/USD Trade Setup: We are testing the weekly resistance block near 1.0920. If we see a strong bearish engulfing candlestick on the 4H close, I am opening a heavy short position down to the 1.0750 liquidity pool. Stay disciplined! 📈💶",
        image: "",
        group: forexMasters._id,
        likes: [alex._id, mike._id],
        tags: ["EURUSD", "Forex", "ShortSetup"],
        comments: [
          {
            user: alex._id,
            text: "Clean setup Elena. I will set my alert at 1.0920 to watch for the rejection.",
          },
          {
            user: mike._id,
            text: "The US Dollar index (DXY) is holding support at 104, which supports this short.",
          },
        ],
      },

      // Private Gold & Commodities post
      {
        user: marcus._id,
        content: "Inflation hedging in gold futures: Opening a long leverage position at $2,400. Risk level is strictly managed with a stop-loss at $2,370. 🚨",
        image: "",
        group: goldCommodities._id,
        likes: [sarah._id],
        tags: ["Gold", "Commodities"],
        comments: [
          {
            user: sarah._id,
            text: "Perfect entries. Geo-political tensions will keep bid support strong.",
          },
        ],
      },

      // Tech Growth Investors posts
      {
        user: carlos._id,
        content: "Semiconductor check: ASML is down 5% today on supply chain rumors. In my opinion, this is a golden buying opportunity. The lithography monopoly isn't going anywhere. 🇳🇱🔌",
        image: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600",
        group: techGrowth._id,
        likes: [sophia._id, yuki._id],
        tags: ["ASML", "Semiconductors", "BuyTheDip"],
        comments: [
          {
            user: sophia._id,
            text: "Agreed. Added a few shares. Rare to see ASML on discount.",
          },
        ],
      },

      // Options Strategies posts
      {
        user: isabella._id,
        content: "Iron Condor strategy on SPY: With market consolidating between $520 and $535, I've opened a 30-day Iron Condor (Sell $540 C, Buy $545 C, Sell $515 P, Buy $510 P). Max profit is $180 per contract. Let's collect that decay! ⏳💰",
        image: "",
        group: optionsRoom._id,
        likes: [sophia._id, yuki._id, sarah._id],
        tags: ["SPY", "IronCondor", "IncomeOptions"],
        comments: [
          {
            user: sarah._id,
            text: "What is your adjustment plan if we test the upper $535 boundary?",
          },
          {
            user: isabella._id,
            text: "I'll roll the put side up to $525 to collect more credit and balance delta.",
          },
        ],
      },

      // Quant & Algorithmic posts
      {
        user: yuki._id,
        content: "Backtesting results: Just completed a 10-year backtest on a Mean Reversion strategy for SP500 constituents using Bollinger Bands and RSI filter. Sharpe Ratio: 1.84. Max Drawdown: 12.6%. Writing execution script in Python. 🐍📊",
        image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600",
        group: quantRoom._id,
        likes: [alex._id, liam._id],
        tags: ["Backtest", "Python", "QuantTrading", "DataScience"],
        comments: [
          {
            user: alex._id,
            text: "Are you factoring in slippage and transaction costs?",
          },
          {
            user: yuki._id,
            text: "Yes, included a 0.05% round-trip fee per transaction. It lowers Sharpe to 1.71 but keeps it realistic.",
          },
        ],
      },

      // Dividend Income posts
      {
        user: arthur._id,
        content: "Why I prefer Dividend Growth Investing (DGI): When the market crashes, option traders blow up and growth investors panic. But my companies (Coca-Cola, JNJ, Pepsi) just keep sending cash. Focus on the cash flow, not the stock tickers! 🥂💵",
        image: "",
        group: dividendRoom._id,
        likes: [marcus._id, sarah._id, mike._id],
        tags: ["Investing", "FinancialFreedom", "ValueStocks"],
        comments: [
          {
            user: mike._id,
            text: "Amen. Reinvesting in bear markets makes the snowball grow even faster.",
          },
        ],
      },
    ];

    const posts = await Post.insertMany(postsData);
    console.log(`Created ${posts.length} posts successfully ✓`);

    // 4. Create Historical Chat Messages (A full trading desk discussion)
    console.log("Creating historical global chat messages...");
    const messagesData = [
      {
        sender: admin._id,
        text: "Welcome to the TraderNet live global trading room! Connect with global traders in real-time. 📈🚀",
        createdAt: new Date(Date.now() - 3600000 * 5),
      },
      {
        sender: marcus._id,
        text: "Morning everyone! Pre-market futures are looking volatile. CPI prints in 2 hours.",
        createdAt: new Date(Date.now() - 3600000 * 4.5),
      },
      {
        sender: mike._id,
        text: "Fed watch: Consensus expects CPI at 3.1%. If it comes in hotter at 3.3%+, we are going to see yields spike and tech sell off.",
        createdAt: new Date(Date.now() - 3600000 * 4.2),
      },
      {
        sender: sophia._id,
        text: "Agreed Mike. I trimmed my tech longs. Sitting in cash until the numbers drop.",
        createdAt: new Date(Date.now() - 3600000 * 4.0),
      },
      {
        sender: carlos._id,
        text: "Too cowardly! I bought NVDA weekly calls. Send it! 🎰",
        createdAt: new Date(Date.now() - 3600000 * 3.8),
      },
      {
        sender: isabella._id,
        text: "Carlos, selling premium is the play here. IV is too high to buy naked calls.",
        createdAt: new Date(Date.now() - 3600000 * 3.6),
      },
      {
        sender: alex._id,
        text: "Bitcoin doesn't care about the Fed. Just reclaimed $67,500. Spot bids are massive.",
        createdAt: new Date(Date.now() - 3600000 * 3.2),
      },
      {
        sender: liam._id,
        text: "Absolutely Alex. Institutional flows from the new ETFs are absorbing all selling pressure.",
        createdAt: new Date(Date.now() - 3600000 * 3.0),
      },
      {
        sender: yuki._id,
        text: "Just ran a correlation matrix: Bitcoin is starting to decouple from the SPY index. Showing 0.25 correlation over the last 30 days.",
        createdAt: new Date(Date.now() - 3600000 * 2.8),
      },
      {
        sender: sarah._id,
        text: "Good stat Yuki. Safe havens are gaining strength. Gold is also pushing highs.",
        createdAt: new Date(Date.now() - 3600000 * 2.5),
      },
      {
        sender: elena._id,
        text: "CPI IS OUT! 3.4%! Hotter than expected! 🚨",
        createdAt: new Date(Date.now() - 3600000 * 2.0),
      },
      {
        sender: mike._id,
        text: "Wow. 3.4% is a major shock. Bonds are dumping immediately. 10-year yield jumps to 4.5%.",
        createdAt: new Date(Date.now() - 3600000 * 1.9),
      },
      {
        sender: elena._id,
        text: "Shorting EUR/USD heavily here! The dollar is strengthening rapidly.",
        createdAt: new Date(Date.now() - 3600000 * 1.8),
      },
      {
        sender: carlos._id,
        text: "Ouch. NVDA is down 3% pre-market. My calls are bleeding...",
        createdAt: new Date(Date.now() - 3600000 * 1.7),
      },
      {
        sender: isabella._id,
        text: "That's the IV crush and interest rate shock. Hope your position size was small.",
        createdAt: new Date(Date.now() - 3600000 * 1.6),
      },
      {
        sender: arthur._id,
        text: "Dividend blue chips are holding green. Pepsi and Coca-Cola are solid rocks. 🥤",
        createdAt: new Date(Date.now() - 3600000 * 1.5),
      },
      {
        sender: marcus._id,
        text: "Gold futures just exploded to $2,430. Perfect inflation hedge.",
        createdAt: new Date(Date.now() - 3600000 * 1.2),
      },
      {
        sender: liam._id,
        text: "Bitcoin dipped to $66k and was instantly bought back. Currently at $68,200. Bull market is structural.",
        createdAt: new Date(Date.now() - 3600000 * 1.0),
      },
      {
        sender: alex._id,
        text: "I just added to my spot BTC bag. Dip buying rules.",
        createdAt: new Date(Date.now() - 3600000 * 0.8),
      },
      {
        sender: elena._id,
        text: "Took profit on my EUR/USD short. +65 pips. Cleanest trade of the week! 💰",
        createdAt: new Date(Date.now() - 3600000 * 0.5),
      },
      {
        sender: yuki._id,
        text: "Executing automated grid bot on ETH/USDT. Expecting range-bound behavior between $3300 and $3600.",
        createdAt: new Date(Date.now() - 3600000 * 0.2),
      },
      {
        sender: admin._id,
        text: "Excellent risk management today team. Remember to keep emotional trading to a minimum. 📊📈",
        createdAt: new Date(Date.now() - 60000),
      },
    ];

    const messages = await Message.insertMany(messagesData);
    console.log(`Created ${messages.length} chat messages successfully ✓`);

    console.log("Database seeded successfully and gracefully closed! Excellent.");
    process.exit(0);
  } catch (error) {
    console.error("Database seeding failed:", error);
    process.exit(1);
  }
};

seedDatabase();
