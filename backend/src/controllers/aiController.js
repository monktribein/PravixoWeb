import { query } from "../config/postgres.js";
import { formatProfile, formatCampaign } from "../utils/formatters.js";

// =========================================================================
// 1. AI PITCH GENERATOR
// =========================================================================
export const generatePitch = async (req, res) => {
  try {
    const {
      brandName,
      brandNiche,
      creatorName,
      creatorCategory,
      creatorFollowers,
      tone = "professional",
      customPoints = "",
    } = req.body;

    const creatorDisplayName = creatorName || "Creator";
    const brandDisplayName = brandName || "Brand Team";
    const niche = creatorCategory || brandNiche || "Content Creation";
    const followersCount = creatorFollowers
      ? `${Number(creatorFollowers).toLocaleString()} engaged followers`
      : "a highly targeted community";

    const pitchesByTone = {
      professional: [
        `Hi ${brandDisplayName}, I'm ${creatorDisplayName}, specializing in ${niche} with ${followersCount}. I've closely followed your recent campaigns and see a high-impact synergy with my audience demographics. I'd love to produce high-retention deliverables (Reels/Stories) highlighting your unique value proposition with measurable CTR and brand recall. Let's collaborate to drive real conversion.`,
        `Hello ${brandDisplayName}! As a creator in the ${niche} domain, my audience values authentic and engaging product integrations. I can deliver polished, high-converting video content tailored precisely to your brand guidelines and target audience. Looking forward to discussing the deliverables and timeline.`,
      ],
      creative: [
        `Hey ${brandDisplayName}! 🚀 Loved what you're doing in the ${niche} space. I have a fresh, hook-driven storytelling concept that will organically showcase your product to my ${followersCount}. We can craft a high-retention narrative that feels natural rather than an ad. Excited to bring this concept to life with you!`,
        `Hi team ${brandDisplayName}! ✨ I've got a creative Reel storyline planned that seamlessly blends humor and aesthetic product integration for the ${niche} audience. My previous campaigns in this niche achieved 2.5x industry average engagement. Let's make something viral together!`,
      ],
      high_energy: [
        `Hey ${brandDisplayName}! 🔥 Super thrilled about the chance to partner up! My community of ${followersCount} is deeply passionate about ${niche} and always looking for top recommendations. Let's team up for an electrifying campaign that boosts your visibility and drives instant traction!`,
      ],
      barter_focus: [
        `Hi ${brandDisplayName}! 🤝 I love your brand and products. As a dedicated ${niche} creator, I'm excited to propose a barter collaboration: in exchange for your product package, I will deliver a high-quality unboxing and dedicated testimonial Reel showcasing authentic first impressions to my ${followersCount}. Let's create an authentic buzz!`,
        `Hello ${brandDisplayName}! 🎁 Open to a product gifting & review collaboration! I create aesthetic, genuine lifestyle reviews in the ${niche} space and would love to feature your newest collection in my upcoming content.`,
      ],
    };

    const selectedPool = pitchesByTone[tone] || pitchesByTone.professional;
    const basePitch = selectedPool[Math.floor(Math.random() * selectedPool.length)];

    let finalPitch = basePitch;
    if (customPoints && customPoints.trim()) {
      finalPitch += ` Specifically: ${customPoints.trim()}`;
    }

    return res.status(200).json({
      success: true,
      data: {
        pitch: finalPitch,
        tone,
        creatorDisplayName,
        brandDisplayName,
      },
    });
  } catch (error) {
    console.error("Error generating AI pitch:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate AI pitch",
    });
  }
};

// =========================================================================
// 2. AI SMART MATCHMAKING FOR BRANDS & CAMPAIGNS
// =========================================================================
export const getSmartMatches = async (req, res) => {
  try {
    const { campaignId, category, maxBudget, minFollowers, location, isBarter } = req.query;

    let targetCategory = category || "";
    let targetBudget = Number(maxBudget) || 0;
    let targetMinFollowers = Number(minFollowers) || 0;
    let targetLocation = location || "";
    let requireBarter = isBarter === "true" || isBarter === true;

    // Pull campaign criteria if campaignId provided
    if (campaignId) {
      const campRes = await query(`SELECT * FROM campaigns WHERE id::text = $1;`, [campaignId]);
      if (campRes.rows.length > 0) {
        const campaign = campRes.rows[0];
        targetCategory = targetCategory || campaign.category || "";
        targetBudget = targetBudget || Number(campaign.max_budget_per_creator || campaign.total_budget || 0);
        targetMinFollowers = targetMinFollowers || Number(campaign.min_followers || 0);
        targetLocation = targetLocation || campaign.location || "";
        if (campaign.is_barter_allowed) requireBarter = true;
      }
    }

    // Fetch live active creators
    const { rows: creators } = await query(
      `
      SELECT * FROM profiles
      WHERE role = 'creator'
        AND is_suspended = false
        AND is_deleted = false
        AND email NOT ILIKE '%@pravixo.test'
        AND email NOT ILIKE '%@test.com';
      `
    );

    const validCreators = creators.filter(
      (p) =>
        !/task20|impostor|suspended|test brand|dummy|alice referrer|bob creator|charlie creator/i.test(
          p.full_name || ""
        )
    );

    const scoredCreators = validCreators.map((rawCreator) => {
      const creator = formatProfile(rawCreator);
      let score = 50;
      const matchReasons = [];

      const totalFollowers =
        Number(creator.instagramFollowers || 0) +
        Number(creator.facebookFollowers || 0) +
        Number(creator.linkedinFollowers || 0) +
        Number(creator.youtubeFollowers || 0) +
        Number(creator.quoraFollowers || 0) +
        Number(creator.twitterFollowers || 0);

      const creatorCat = (creator.category || "").toLowerCase();
      const creatorLoc = (creator.location || "").toLowerCase();
      const creatorPrice = Number(creator.startingPrice || 0);

      if (targetCategory && targetCategory !== "All") {
        const targetCatLower = targetCategory.toLowerCase();
        if (creatorCat.includes(targetCatLower) || targetCatLower.includes(creatorCat)) {
          score += 30;
          matchReasons.push(`Direct Niche Match (${creator.category || targetCategory})`);
        } else {
          score -= 10;
        }
      } else {
        score += 15;
      }

      if (requireBarter && creator.isBarterAllowed) {
        score += 20;
        matchReasons.push("Barter Friendly Partner 🤝");
      } else if (targetBudget > 0) {
        if (creatorPrice <= targetBudget && creatorPrice > 0) {
          score += 20;
          matchReasons.push("Within Target Budget Range 💰");
        } else if (creatorPrice > targetBudget * 1.5) {
          score -= 15;
        } else {
          score += 10;
        }
      } else {
        score += 10;
      }

      if (targetMinFollowers > 0) {
        if (totalFollowers >= targetMinFollowers) {
          score += 15;
          matchReasons.push(`Audience criteria met (${totalFollowers.toLocaleString()}+ followers)`);
        } else {
          score -= 10;
        }
      } else if (totalFollowers > 10000) {
        score += 10;
        matchReasons.push("Established Reach");
      }

      if (targetLocation && targetLocation !== "All") {
        if (creatorLoc.includes(targetLocation.toLowerCase())) {
          score += 10;
          matchReasons.push(`Location matched (${creator.location})`);
        }
      }

      if (creator.verificationStatus === "verified") {
        score += 5;
        matchReasons.push("Verified Creator ⭐");
      }

      const finalScore = Math.min(99, Math.max(65, Math.round(score)));

      return {
        ...creator,
        followers: totalFollowers,
        matchScore: finalScore,
        matchReasons: matchReasons.slice(0, 3),
      };
    });

    scoredCreators.sort((a, b) => b.matchScore - a.matchScore);

    return res.status(200).json({
      success: true,
      data: scoredCreators.slice(0, 20),
    });
  } catch (error) {
    console.error("Error calculating smart matches:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate smart matches",
    });
  }
};
