import { query } from "../config/postgres.js";
import {
  formatAgreement,
  formatConnection,
  formatProfile,
  formatCampaign,
  formatMessage,
} from "../utils/formatters.js";
import { buildAgreementPdfBuffer, uploadAgreementPdf } from "../services/agreementPdfService.js";

const generateAgreementTerms = (
  brandName,
  creatorName,
  campaignTitle,
  creatorAmount,
  pravixoFee,
  brandTotal
) => [
  {
    sectionNumber: 1,
    title: "1. Parties to the Agreement",
    content: `This Collaboration Agreement ("Agreement") is entered into between ${brandName} ("Brand") and ${creatorName} ("Creator"), facilitated and administered through the Pravixo Platform ("Pravixo").`,
  },
  {
    sectionNumber: 2,
    title: "2. Campaign & Scope of Work",
    content: `The Creator agrees to produce, deliver, and publish original promotional content for the "${campaignTitle}" campaign in accordance with the specified deliverables schedule and guidelines.`,
  },
  {
    sectionNumber: 3,
    title: "3. Deliverables & Specifications",
    content: `The Creator shall complete and submit all agreed deliverable items (Reels, Posts, Stories, and/or Videos) through the Pravixo Deliverables Portal before the agreed campaign deadline.`,
  },
  {
    sectionNumber: 4,
    title: "4. Creator Compensation",
    content: `Upon satisfactory completion and Brand approval of all required deliverables, Creator is entitled to receive full agreed net compensation of ₹${Number(
      creatorAmount
    ).toLocaleString(
      "en-IN"
    )} (80% net payout after 20% Pravixo platform service fee deduction from total campaign budget).`,
  },
  {
    sectionNumber: 5,
    title: "5. Pravixo Platform Service Fee",
    content: `Pravixo charges a 20% platform administration and escrow guarantee service fee of ₹${Number(
      pravixoFee
    ).toLocaleString("en-IN")}, deducted from the total campaign budget of ₹${Number(
      brandTotal
    ).toLocaleString("en-IN")}.`,
  },
  {
    sectionNumber: 6,
    title: "6. Total Brand Payment & Escrow Security",
    content: `The Brand shall deposit total funding of ₹${Number(brandTotal).toLocaleString(
      "en-IN"
    )} into Pravixo Escrow prior to creator work commencement. Funds remain secured until completion and review criteria are fulfilled.`,
  },
  {
    sectionNumber: 7,
    title: "7. Content Submission & Review Process",
    content: `Creator must upload deliverable drafts or media proof via the Pravixo submission system. Brand shall review each submission within the standard turnaround period and either approve or request rework with constructive feedback.`,
  },
  {
    sectionNumber: 8,
    title: "8. Revisions & Rework",
    content: `If a deliverable is rejected by the Brand with specific feedback, Creator agrees to make reasonable corrections and submit a revised version in a timely manner.`,
  },
  {
    sectionNumber: 9,
    title: "9. Approval & 72-Hour Protection Review Period",
    content: `Upon 100% approval of all deliverables by the Brand, a 72-hour escrow review period commences. Following expiration of this review window, payment becomes fully eligible for platform release to the Creator's wallet.`,
  },
  {
    sectionNumber: 10,
    title: "10. Intellectual Property & Usage Rights",
    content: `Creator grants the Brand a non-exclusive, worldwide license to use, display, and repost the approved collaboration content for promotional purposes during the campaign duration.`,
  },
  {
    sectionNumber: 11,
    title: "11. Confidentiality & Non-Disclosure",
    content: `Both Parties agree to keep non-public campaign details, pricing terms, unreleased products, and proprietary marketing strategies strictly confidential.`,
  },
  {
    sectionNumber: 12,
    title: "12. General Terms & Dispute Resolution",
    content: `This Agreement is governed by the laws of India. Any disputes arising from this collaboration shall first be mediated through Pravixo Platform Support and Resolution Services.`,
  },
];

const generateUniqueAgreementId = async () => {
  const year = new Date().getFullYear();
  const countRes = await query(`SELECT COUNT(*)::int as count FROM agreements`);
  const count = countRes.rows[0]?.count || 0;
  const sequence = String(count + 1).padStart(6, "0");
  let candidate = `PRV-AGR-${year}-${sequence}`;

  let exists = await query(`SELECT id FROM agreements WHERE agreement_id = $1 LIMIT 1`, [candidate]);
  let counter = 1;
  while (exists.rows.length > 0) {
    candidate = `PRV-AGR-${year}-${String(count + 1 + counter).padStart(6, "0")}`;
    exists = await query(`SELECT id FROM agreements WHERE agreement_id = $1 LIMIT 1`, [candidate]);
    counter++;
  }
  return candidate;
};

// Helper: Find Profile
const findProfile = async (idOrUserId) => {
  if (!idOrUserId) return null;
  const res = await query(
    `SELECT * FROM profiles WHERE id::text = $1 OR user_id = $1 LIMIT 1`,
    [String(idOrUserId)]
  );
  return res.rows[0] ? formatProfile(res.rows[0]) : null;
};

// Helper: Find Connection
const findConnection = async (id) => {
  if (!id) return null;
  const res = await query(`SELECT * FROM connections WHERE id::text = $1 LIMIT 1`, [String(id)]);
  return res.rows[0] ? formatConnection(res.rows[0]) : null;
};

// Helper: Find Agreement
const findAgreement = async (idOrAgreementId) => {
  if (!idOrAgreementId) return null;
  const res = await query(
    `SELECT * FROM agreements WHERE id::text = $1 OR agreement_id = $1 LIMIT 1`,
    [String(idOrAgreementId)]
  );
  return res.rows[0] ? formatAgreement(res.rows[0]) : null;
};

// 1. Generate or Retrieve Agreement for a Collaboration
export const generateAgreement = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { forceRegenerate } = req.body || {};

    const connection = await findConnection(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration connection not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const userProfileId = String(req.user.id || req.user._id);
      const isBrand = String(connection.brandId) === userProfileId;
      const isCreator = String(connection.creatorId) === userProfileId;
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not a participant in this collaboration.",
        });
      }
    }

    if (connection.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: "Agreements can only be generated for accepted collaborations.",
      });
    }

    const [brandProfile, creatorProfile] = await Promise.all([
      findProfile(connection.brandId),
      findProfile(connection.creatorId),
    ]);

    if (!brandProfile || !creatorProfile) {
      return res.status(404).json({
        success: false,
        message: "Brand or Creator profile not found.",
      });
    }

    let campaign = null;
    if (connection.campaignId) {
      const campRes = await query(`SELECT * FROM campaigns WHERE id = $1 LIMIT 1`, [
        connection.campaignId,
      ]);
      campaign = campRes.rows[0] ? formatCampaign(campRes.rows[0]) : null;
    }

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign associated with this collaboration was not found.",
      });
    }

    const brandTotal =
      Number(connection.brandTotal) ||
      (Number(connection.creatorAmount) ? Math.round(Number(connection.creatorAmount) / 0.8) : 0);
    if (brandTotal <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot generate agreement: Collaboration budget amount has not been agreed or is ₹0.",
      });
    }

    const pravixoFee = Number(connection.pravixoFee) || Math.round(brandTotal * 0.2);
    const creatorAmount = Number(connection.creatorAmount) || brandTotal - pravixoFee;

    let deliverablesSnapshot = [];
    if (connection.deliverablesTracking && connection.deliverablesTracking.length > 0) {
      deliverablesSnapshot = connection.deliverablesTracking
        .filter((d) => d.requiredQuantity > 0)
        .map((d) => ({
          type: d.type,
          requiredQuantity: d.requiredQuantity,
          status: d.status || "PENDING",
          notes: "",
        }));
    } else if (campaign.deliverables) {
      const { reels = 0, posts = 0, stories = 0, videos = 0, notes = "" } = campaign.deliverables;
      if (reels > 0) deliverablesSnapshot.push({ type: "REEL", requiredQuantity: reels, status: "PENDING", notes });
      if (posts > 0) deliverablesSnapshot.push({ type: "POST", requiredQuantity: posts, status: "PENDING", notes });
      if (stories > 0) deliverablesSnapshot.push({ type: "STORY", requiredQuantity: stories, status: "PENDING", notes });
      if (videos > 0) deliverablesSnapshot.push({ type: "VIDEO", requiredQuantity: videos, status: "PENDING", notes });
    }

    if (deliverablesSnapshot.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot generate agreement: No deliverables configured for this collaboration.",
      });
    }

    const existingRes = await query(
      `SELECT * FROM agreements WHERE collaboration_id = $1 ORDER BY version DESC LIMIT 1`,
      [connection.id]
    );
    const latestAgreement = existingRes.rows[0] ? formatAgreement(existingRes.rows[0]) : null;

    if (latestAgreement && !forceRegenerate) {
      return res.status(200).json({
        success: true,
        message: "Existing agreement retrieved successfully.",
        data: latestAgreement,
        isExisting: true,
      });
    }

    const nextVersion = latestAgreement ? latestAgreement.version + 1 : 1;
    const agreementId = await generateUniqueAgreementId();

    const brandSnapshot = {
      brandId: String(brandProfile.id),
      fullName: brandProfile.fullName || "Brand",
      handle: brandProfile.handle || "",
      email: brandProfile.email || "",
      phone: brandProfile.phone || "",
      location: brandProfile.location || "",
      companySize: brandProfile.companySize || "",
      website: brandProfile.website || "",
      gstNumber: brandProfile.gstNumber || "",
      avatarUrl: brandProfile.avatarUrl || "",
    };

    const creatorSnapshot = {
      creatorId: String(creatorProfile.id),
      fullName: creatorProfile.fullName || "Creator",
      handle: creatorProfile.handle || "",
      email: creatorProfile.email || "",
      phone: creatorProfile.phone || "",
      location: creatorProfile.location || "",
      category: creatorProfile.category || "",
      instagramHandle: creatorProfile.instagramHandle || "",
      youtubeHandle: creatorProfile.youtubeHandle || "",
      avatarUrl: creatorProfile.avatarUrl || "",
    };

    const campaignSnapshot = {
      campaignId: String(campaign.id),
      title: campaign.title || "Campaign",
      description: campaign.description || "",
      category: campaign.category || "",
      location: campaign.location || "Pan India",
      startDate: campaign.startDate || Date.now(),
      endDate: campaign.endDate || Date.now(),
      totalBudget: campaign.totalBudget || 0,
    };

    const financialsSnapshot = {
      creatorAmount,
      pravixoFee,
      brandTotal,
      currency: "INR",
    };

    const terms = generateAgreementTerms(
      brandSnapshot.fullName,
      creatorSnapshot.fullName,
      campaignSnapshot.title,
      creatorAmount,
      pravixoFee,
      brandTotal
    );

    const now = Date.now();
    const insRes = await query(
      `INSERT INTO agreements (
        agreement_id, collaboration_id, campaign_id, brand_id, creator_id,
        version, status, brand_snapshot, creator_snapshot, campaign_snapshot,
        deliverables_snapshot, financials_snapshot, terms, generated_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'GENERATED', $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13, NOW(), NOW())
      RETURNING *`,
      [
        agreementId,
        connection.id,
        campaign.id,
        brandProfile.id,
        creatorProfile.id,
        nextVersion,
        JSON.stringify(brandSnapshot),
        JSON.stringify(creatorSnapshot),
        JSON.stringify(campaignSnapshot),
        JSON.stringify(deliverablesSnapshot),
        JSON.stringify(financialsSnapshot),
        JSON.stringify(terms),
        now,
      ]
    );

    const agreement = formatAgreement(insRes.rows[0]);

    res.status(201).json({
      success: true,
      message: `Collaboration agreement ${agreement.agreementId} (v${agreement.version}) generated successfully.`,
      data: agreement,
      isExisting: false,
    });
  } catch (error) {
    console.error("Generate agreement error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate collaboration agreement.",
      error: error.message,
    });
  }
};

// 2. Get latest agreement for a collaboration
export const getAgreementByCollaboration = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = await findConnection(connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration connection not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const userProfileId = String(req.user.id || req.user._id);
      const isBrand = String(connection.brandId) === userProfileId;
      const isCreator = String(connection.creatorId) === userProfileId;
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have permission to access this agreement.",
        });
      }
    }

    const agrRes = await query(
      `SELECT * FROM agreements WHERE collaboration_id = $1 ORDER BY version DESC LIMIT 1`,
      [connection.id]
    );

    if (agrRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No agreement found for this collaboration.",
      });
    }

    res.status(200).json({
      success: true,
      data: formatAgreement(agrRes.rows[0]),
    });
  } catch (error) {
    console.error("Get agreement by collaboration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch collaboration agreement.",
      error: error.message,
    });
  }
};

// 3. Get all agreement versions for a collaboration
export const getAgreementVersions = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const connection = await findConnection(connectionId);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Collaboration connection not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const userProfileId = String(req.user.id || req.user._id);
      const isBrand = String(connection.brandId) === userProfileId;
      const isCreator = String(connection.creatorId) === userProfileId;
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have permission to view agreement history.",
        });
      }
    }

    const versRes = await query(
      `SELECT * FROM agreements WHERE collaboration_id = $1 ORDER BY version DESC`,
      [connection.id]
    );

    res.status(200).json({
      success: true,
      data: versRes.rows.map(formatAgreement),
    });
  } catch (error) {
    console.error("Get agreement versions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agreement versions.",
      error: error.message,
    });
  }
};

// 4. Get agreement by unique Agreement ID or DB ID
export const getAgreementById = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const agreement = await findAgreement(agreementId);

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement document not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const userProfileId = String(req.user.id || req.user._id);
      const isBrand = String(agreement.brandId) === userProfileId;
      const isCreator = String(agreement.creatorId) === userProfileId;
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not authorized to view this agreement.",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: agreement,
    });
  } catch (error) {
    console.error("Get agreement by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agreement.",
      error: error.message,
    });
  }
};

// 5. Sign / Accept Agreement
export const signAgreement = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { signatureMethod = "DIGITAL_ACCEPTANCE" } = req.body || {};

    const agreement = await findAgreement(agreementId);
    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement document not found.",
      });
    }

    const userId = req.user?.id || req.user?._id;
    const userRole = req.user?.role;
    const isBrand = String(agreement.brandId) === String(userId) && userRole === "brand";
    const isCreator = String(agreement.creatorId) === String(userId) && userRole === "creator";
    const isAdmin = userRole === "admin";

    if (!isBrand && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You do not have permission to sign this agreement.",
      });
    }

    const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
    const now = Date.now();
    let notificationRecipients = [];
    let notificationText = "";
    let notificationType = "";

    let brandSig = agreement.brandSignature || {};
    let creatorSig = agreement.creatorSignature || {};
    let adminSig = agreement.adminSignature || {};

    if (isBrand) {
      if (brandSig.signed) {
        return res.status(400).json({
          success: false,
          message: "You have already signed this agreement version.",
          data: agreement,
        });
      }
      brandSig = {
        signed: true,
        userId,
        name: req.user.fullName || agreement.brandSnapshot?.fullName || "Brand Representative",
        signedAt: now,
        signatureMethod,
        ipAddress,
      };
      notificationType = "agreement_signed_brand";
      notificationText = `The Brand has signed the collaboration agreement for "${agreement.campaignSnapshot?.title}".`;
      notificationRecipients.push(agreement.creatorId);
    } else if (isCreator) {
      if (creatorSig.signed) {
        return res.status(400).json({
          success: false,
          message: "You have already signed this agreement version.",
          data: agreement,
        });
      }
      creatorSig = {
        signed: true,
        userId,
        name: req.user.fullName || agreement.creatorSnapshot?.fullName || "Creator",
        signedAt: now,
        signatureMethod,
        ipAddress,
      };
      notificationType = "agreement_signed_creator";
      notificationText = `The Creator has signed the collaboration agreement for "${agreement.campaignSnapshot?.title}".`;
      notificationRecipients.push(agreement.brandId);
    } else if (isAdmin) {
      if (adminSig.signed) {
        return res.status(400).json({
          success: false,
          message: "Admin signature is already recorded for this agreement version.",
          data: agreement,
        });
      }
      adminSig = {
        signed: true,
        userId,
        name: req.user.fullName || "Pravixo Compliance Admin",
        signedAt: now,
        signatureMethod: "ADMIN_APPROVAL",
        ipAddress,
      };
    }

    let signatureStatus = "PARTIALLY_SIGNED";
    let fullySignedAt = agreement.fullySignedAt || null;

    if (brandSig.signed && creatorSig.signed && adminSig.signed) {
      signatureStatus = "FULLY_SIGNED";
      fullySignedAt = now;
      notificationType = "agreement_fully_signed";
      notificationText = `The collaboration agreement for "${agreement.campaignSnapshot?.title}" is now fully signed by all parties.`;

      const adminProfiles = await query(`SELECT id FROM profiles WHERE role = 'admin'`);
      const adminIds = adminProfiles.rows.map((a) => a.id);
      notificationRecipients = [agreement.brandId, agreement.creatorId, ...adminIds];
    }

    const updRes = await query(
      `UPDATE agreements
       SET brand_signature = $1::jsonb,
           creator_signature = $2::jsonb,
           admin_signature = $3::jsonb,
           signature_status = $4,
           fully_signed_at = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        JSON.stringify(brandSig),
        JSON.stringify(creatorSig),
        JSON.stringify(adminSig),
        signatureStatus,
        fullySignedAt,
        agreement.id,
      ]
    );

    const updatedAgreement = formatAgreement(updRes.rows[0]);

    if (notificationRecipients.length > 0 && notificationText && notificationType) {
      for (const recId of notificationRecipients) {
        if (String(recId) !== String(userId)) {
          await query(
            `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, read, created_at, created_at_dt)
             VALUES ($1, $2, $3, $4, '/messages', $5::jsonb, false, $6, NOW())`,
            [
              recId,
              userId,
              notificationType,
              notificationText,
              JSON.stringify({ agreementId: agreement.id, version: agreement.version }),
              now,
            ]
          ).catch((e) => console.warn("Signature notification error:", e.message));
        }
      }
    }

    res.status(200).json({
      success: true,
      message:
        signatureStatus === "FULLY_SIGNED"
          ? "Agreement signed successfully! The agreement is now FULLY_SIGNED."
          : "Agreement signature recorded successfully.",
      data: updatedAgreement,
    });
  } catch (error) {
    console.error("Sign agreement error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record agreement signature.",
      error: error.message,
    });
  }
};

// 6. Get signatures details
export const getAgreementSignatures = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const agreement = await findAgreement(agreementId);

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement document not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const userProfileId = String(req.user.id || req.user._id);
      const isBrand = String(agreement.brandId) === userProfileId;
      const isCreator = String(agreement.creatorId) === userProfileId;
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not authorized to view this agreement's signatures.",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        agreementId: agreement.agreementId,
        version: agreement.version,
        signatureStatus: agreement.signatureStatus || "PENDING_SIGNATURES",
        fullySignedAt: agreement.fullySignedAt,
        brandSignature: agreement.brandSignature || { signed: false },
        creatorSignature: agreement.creatorSignature || { signed: false },
        adminSignature: agreement.adminSignature || { signed: false },
      },
    });
  } catch (error) {
    console.error("Get agreement signatures error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agreement signatures.",
      error: error.message,
    });
  }
};

// 7. Generate or Retrieve Final Signed Agreement PDF
export const generateAgreementPdf = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const agreement = await findAgreement(agreementId);

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement document not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const userProfileId = String(req.user.id || req.user._id);
      const isBrand = String(agreement.brandId) === userProfileId;
      const isCreator = String(agreement.creatorId) === userProfileId;
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have permission to access this agreement's PDF.",
        });
      }
    }

    if (agreement.signatureStatus !== "FULLY_SIGNED") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot generate final PDF: Agreement has not been fully signed by Brand, Creator, and Admin.",
        signatureStatus: agreement.signatureStatus,
      });
    }

    if (agreement.pdfUrl && agreement.pdfVersion === agreement.version) {
      return res.status(200).json({
        success: true,
        message: "Existing final signed agreement PDF retrieved successfully.",
        data: {
          agreementId: agreement.agreementId,
          version: agreement.version,
          pdfUrl: agreement.pdfUrl,
          pdfGeneratedAt: agreement.pdfGeneratedAt,
          isExisting: true,
        },
      });
    }

    const pdfBuffer = await buildAgreementPdfBuffer(agreement);
    const deterministicFilename = `${agreement.agreementId}-v${agreement.version}`;

    let uploadedUrl = "";
    let uploadedPublicId = "";

    try {
      const uploadResult = await uploadAgreementPdf(pdfBuffer, deterministicFilename);
      uploadedUrl = uploadResult.secure_url || uploadResult.url;
      uploadedPublicId = uploadResult.public_id;
    } catch (uploadError) {
      console.warn("Cloudinary upload failed, falling back to base64 URI:", uploadError.message);
      uploadedUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
      uploadedPublicId = deterministicFilename;
    }

    const now = Date.now();
    await query(
      `UPDATE agreements
       SET pdf_url = $1, pdf_public_id = $2, pdf_generated_at = $3, pdf_version = $4, updated_at = NOW()
       WHERE id = $5`,
      [uploadedUrl, uploadedPublicId, now, agreement.version, agreement.id]
    );

    res.status(200).json({
      success: true,
      message: "Final signed agreement PDF generated successfully.",
      data: {
        agreementId: agreement.agreementId,
        version: agreement.version,
        pdfUrl: uploadedUrl,
        pdfGeneratedAt: now,
        isExisting: false,
      },
    });
  } catch (error) {
    console.error("Generate agreement PDF error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate signed agreement PDF.",
      error: error.message,
    });
  }
};

// 8. Get / Stream Agreement PDF
export const getAgreementPdf = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const agreement = await findAgreement(agreementId);

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement document not found.",
      });
    }

    if (req.user && req.user.role !== "admin") {
      const userProfileId = String(req.user.id || req.user._id);
      const isBrand = String(agreement.brandId) === userProfileId;
      const isCreator = String(agreement.creatorId) === userProfileId;
      if (!isBrand && !isCreator) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have permission to view this PDF.",
        });
      }
    }

    if (!agreement.pdfUrl) {
      return res.status(404).json({
        success: false,
        message: "Signed PDF has not been generated for this agreement yet.",
      });
    }

    if (agreement.pdfUrl.startsWith("http")) {
      return res.redirect(agreement.pdfUrl);
    }

    res.status(200).json({
      success: true,
      data: {
        agreementId: agreement.agreementId,
        version: agreement.version,
        pdfUrl: agreement.pdfUrl,
        pdfGeneratedAt: agreement.pdfGeneratedAt,
      },
    });
  } catch (error) {
    console.error("Get agreement PDF error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve agreement PDF.",
      error: error.message,
    });
  }
};

// 9. Send Final Signed Agreement PDF to Collaboration Chat
export const sendAgreementPdfToChat = async (req, res) => {
  try {
    const { agreementId } = req.params;
    const agreement = await findAgreement(agreementId);

    if (!agreement) {
      return res.status(404).json({
        success: false,
        message: "Agreement document not found.",
      });
    }

    const userId = req.user?.id || req.user?._id;
    const userRole = req.user?.role;
    const isBrand = String(agreement.brandId) === String(userId);
    const isCreator = String(agreement.creatorId) === String(userId);
    const isAdmin = userRole === "admin";

    if (!isBrand && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You do not have permission to send this agreement to chat.",
      });
    }

    if (agreement.signatureStatus !== "FULLY_SIGNED") {
      return res.status(400).json({
        success: false,
        message: "Cannot send agreement to chat: Agreement has not been fully signed yet.",
      });
    }

    if (!agreement.pdfUrl) {
      return res.status(400).json({
        success: false,
        message: "Cannot send agreement to chat: Final PDF has not been generated yet.",
      });
    }

    const convRes = await query(
      `SELECT id FROM conversations 
       WHERE creator_id = $1 AND brand_id = $2 
         AND (($3::uuid IS NULL AND campaign_id IS NULL) OR campaign_id = $3::uuid)
       LIMIT 1`,
      [agreement.creatorId, agreement.brandId, agreement.campaignId || null]
    );

    let conversationId = convRes.rows[0]?.id;
    if (!conversationId) {
      const newConv = await query(
        `INSERT INTO conversations (creator_id, brand_id, campaign_id, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id`,
        [agreement.creatorId, agreement.brandId, agreement.campaignId || null]
      );
      conversationId = newConv.rows[0].id;
    }

    // Check duplicate message
    const msgCheck = await query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
         AND message_type = 'agreement_document' 
         AND metadata->>'agreementId' = $2 
         AND metadata->>'version' = $3
       LIMIT 1`,
      [conversationId, agreement.agreementId, String(agreement.version)]
    );

    if (msgCheck.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: "Agreement PDF was already sent to this conversation.",
        data: formatMessage(msgCheck.rows[0]),
        isExisting: true,
      });
    }

    const now = Date.now();
    const senderName = req.user?.fullName || (isAdmin ? "Pravixo Admin" : isBrand ? "Brand" : "Creator");

    const insMsg = await query(
      `INSERT INTO messages (
        conversation_id, sender_id, text, message_type, metadata, read, created_at, updated_at
      ) VALUES ($1, $2, $3, 'agreement_document', $4::jsonb, false, NOW(), NOW())
      RETURNING *`,
      [
        conversationId,
        userId,
        `📄 [Official Collaboration Agreement] Collaboration Agreement (${agreement.agreementId} v${agreement.version}) has been fully signed by all parties.`,
        JSON.stringify({
          agreementId: agreement.agreementId,
          version: agreement.version,
          pdfUrl: agreement.pdfUrl,
          sentAt: now,
          sentBy: senderName,
          signatureStatus: "FULLY_SIGNED",
          brandName: agreement.brandSnapshot?.fullName || "Brand",
          creatorName: agreement.creatorSnapshot?.fullName || "Creator",
          campaignTitle: agreement.campaignSnapshot?.title || "Campaign",
        }),
      ]
    );
    const message = formatMessage(insMsg.rows[0]);

    const recipients = [];
    if (String(agreement.brandId) !== String(userId)) recipients.push(agreement.brandId);
    if (String(agreement.creatorId) !== String(userId)) recipients.push(agreement.creatorId);

    for (const rId of recipients) {
      await query(
        `INSERT INTO notifications (recipient_id, sender_id, type, text, target_url, metadata, read, created_at, created_at_dt)
         VALUES ($1, $2, 'agreement_shared_in_chat', $3, '/messages', $4::jsonb, false, $5, NOW())`,
        [
          rId,
          userId,
          `The fully signed agreement for "${
            agreement.campaignSnapshot?.title || "campaign"
          }" has been posted in your collaboration chat.`,
          JSON.stringify({ agreementId: agreement.id, messageId: message.id }),
          now,
        ]
      ).catch((e) => console.warn("Chat notification error:", e.message));
    }

    return res.status(201).json({
      success: true,
      message: "Final signed agreement PDF successfully sent to chat.",
      data: message,
      isExisting: false,
    });
  } catch (error) {
    console.error("sendAgreementPdfToChat error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send agreement to chat.",
      error: error.message,
    });
  }
};
