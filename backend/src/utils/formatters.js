// =====================================================
// DATA FORMATTERS FOR SUPABASE POSTGRESQL -> API OUTPUT
// Ensures 100% frontend compatibility with camelCase & _id
// =====================================================

export const formatProfile = (p) => {
  if (!p) return null;
  return {
    _id: p.id,
    id: p.id,
    userId: p.user_id,
    fullName: p.full_name || "",
    email: p.email || "",
    role: p.role || "creator",
    gender: p.gender || "",
    handle: p.handle || "",
    category: p.category || "",
    phone: p.phone || "",
    location: p.location || "",
    bio: p.bio || "",
    startingPrice: Number(p.starting_price || 0),
    isBarterAllowed: Boolean(p.is_barter_allowed),
    avatarUrl: p.avatar_url || "",
    avatar: p.avatar_url || "",
    coverUrl: p.cover_url || "",
    profileViews: Number(p.profile_views || 0),
    clicks: Number(p.clicks || 0),
    bookings: Number(p.bookings || 0),
    instagramHandle: p.instagram_handle || "",
    instagramFollowers: Number(p.instagram_followers || 0),
    facebookHandle: p.facebook_handle || "",
    facebookFollowers: Number(p.facebook_followers || 0),
    linkedinHandle: p.linkedin_handle || "",
    linkedinFollowers: Number(p.linkedin_followers || 0),
    youtubeHandle: p.youtube_handle || "",
    youtubeFollowers: Number(p.youtube_followers || 0),
    quoraHandle: p.quora_handle || "",
    quoraFollowers: Number(p.quora_followers || 0),
    twitterHandle: p.twitter_handle || "",
    twitterFollowers: Number(p.twitter_followers || 0),
    customSocialFeeds: (() => {
      let f = p.custom_social_feeds;
      if (typeof f === "string") {
        try { return JSON.parse(f); } catch (e) { return []; }
      }
      return Array.isArray(f) ? f : [];
    })(),
    customPricingPackages: (() => {
      let pk = p.custom_pricing_packages;
      if (typeof pk === "string") {
        try { return JSON.parse(pk); } catch (e) { return []; }
      }
      return Array.isArray(pk) ? pk : [];
    })(),
    socialLinks: p.social_links || {},
    verificationStatus: p.verification_status || "unverified",
    kycDocuments: p.kyc_documents || [],
    isActive: p.is_active !== false,
    isDeleted: Boolean(p.is_deleted),
    isSuspended: Boolean(p.is_suspended),
    suspensionReason: p.suspension_reason || "",
    suspendedUntil: p.suspended_until || null,
    aadharUrl: p.aadhar_url || "",
    aadharStorageId: p.aadhar_storage_id || "",
    panUrl: p.pan_url || "",
    panStorageId: p.pan_storage_id || "",
    gstNumber: p.gst_number || "",
    gstCertificateUrl: p.gst_certificate_url || "",
    gstCertificateStorageId: p.gst_certificate_storage_id || "",
    mediaKitBio: p.media_kit_bio || "",
    mediaKitTagline: p.media_kit_tagline || "",
    audienceHighlights: (() => {
      let a = p.audience_highlights;
      if (typeof a === "string") {
        try { return JSON.parse(a); } catch (e) { return {}; }
      }
      return a || {};
    })(),
    pastBrandsWorkedWith: (() => {
      let b = p.past_brands_worked_with;
      if (typeof b === "string") {
        try { return JSON.parse(b); } catch (e) { return []; }
      }
      return Array.isArray(b) ? b : [];
    })(),
    prefNiches: p.pref_niches || "",
    prefBudget: p.pref_budget || "",
    prefReach: p.pref_reach || "",
    prefRegions: p.pref_regions || "",
    website: p.website || "",
    companySize: p.company_size || "",
    emailNotificationsEnabled: p.email_notifications_enabled !== false,
    unsubscribeToken: p.unsubscribe_token || "",
    referralCode: p.referral_code || "",
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
};

export const formatPricingTier = (t) => {
  if (!t) return null;
  return {
    _id: t.id,
    id: t.id,
    profileId: t.profile_id,
    name: t.name,
    price: Number(t.price || 0),
    sortOrder: Number(t.sort_order || 0),
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
};

export const formatReview = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    targetId: r.target_id,
    reviewerId: r.reviewer_id,
    reviewerRole: r.reviewer_role,
    creatorId: r.creator_id,
    brandId: r.brand_id,
    conversationId: r.conversation_id,
    rating: Number(r.rating || 5),
    title: r.title || "",
    text: r.text || "",
    campaignRef: r.campaign_ref || "",
    status: r.status || "approved",
    visible: r.visible !== false,
    createdAt: r.created_at_dt || r.created_at,
    updatedAt: r.updated_at_dt,
  };
};

export const formatSocialConnection = (c) => {
  if (!c) return null;
  return {
    _id: c.id,
    id: c.id,
    profileId: c.profile_id,
    ownerType: c.owner_type || "creator",
    platform: c.platform,
    handle: c.handle,
    accountId: c.account_id || "",
    verified: Boolean(c.verified),
    syncStatus: c.sync_status || "success",
    syncMode: c.sync_mode || "live",
    followers: Number(c.followers || 0),
    views: Number(c.views || 0),
    engagementRate: Number(c.engagement_rate || 0),
    lastSyncedAt: c.last_synced_at,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
};

export const formatCampaign = (c) => {
  if (!c) return null;
  return {
    _id: c.id,
    id: c.id,
    brandId: c.brand_id,
    title: c.title,
    description: c.description || "",
    category: c.category || "",
    location: c.location || "Pan India",
    totalBudget: Number(c.total_budget || 0),
    minBudgetPerCreator: Number(c.min_budget_per_creator || 0),
    maxBudgetPerCreator: Number(c.max_budget_per_creator || 0),
    minFollowers: Number(c.min_followers || 0),
    tiers: c.tiers || [],
    deliverables: c.deliverables || { reels: 0, posts: 0, stories: 0, videos: 0, notes: "" },
    budget: c.budget || "",
    duration: c.duration || "",
    status: c.status || "PENDING_VERIFICATION",
    verificationFeedback: c.verification_feedback || "",
    active: c.active !== false,
    startDate: c.start_date,
    endDate: c.end_date,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
};

export const formatBlog = (b) => {
  if (!b) return null;
  return {
    _id: b.id,
    id: b.id,
    title: b.title,
    slug: b.slug,
    content: b.content,
    excerpt: b.excerpt || "",
    author: b.author || "Pravixo Team",
    coverImage: b.cover_image || b.cover_image_url || "",
    coverImageUrl: b.cover_image_url || b.cover_image || "",
    category: b.category || "Marketing Strategies",
    targetRole: b.target_role || "creator",
    tags: b.tags || [],
    published: Boolean(b.published),
    featured: Boolean(b.featured),
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
};

export const formatConversation = (c) => {
  if (!c) return null;
  return {
    _id: c.id,
    id: c.id,
    creatorId: c.creator_id,
    brandId: c.brand_id,
    adminId: c.admin_id,
    conversationType: c.conversation_type || "brand_creator",
    campaignId: c.campaign_id,
    status: c.status || "pending",
    archived: Boolean(c.archived),
    deletedForCreator: Boolean(c.deleted_for_creator),
    deletedForBrand: Boolean(c.deleted_for_brand),
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
};

export const formatMessage = (m) => {
  if (!m) return null;
  return {
    _id: m.id,
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    text: m.text,
    read: Boolean(m.read),
    deletedByAdmin: Boolean(m.deleted_by_admin),
    deletedForCreator: Boolean(m.deleted_for_creator),
    deletedForBrand: Boolean(m.deleted_for_brand),
    deletedAt: m.deleted_at,
    unsent: Boolean(m.unsent),
    messageType: m.message_type || "text",
    metadata: typeof m.metadata === "string" ? JSON.parse(m.metadata) : m.metadata || null,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
};

export const formatWallet = (w) => {
  if (!w) return null;
  return {
    _id: w.id,
    id: w.id,
    creatorId: w.creator_id,
    availableBalance: Number(w.available_balance || 0),
    pendingWithdrawalBalance: Number(w.pending_withdrawal_balance || 0),
    totalEarned: Number(w.total_earned || 0),
    totalWithdrawn: Number(w.total_withdrawn || 0),
    currency: w.currency || "INR",
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
};

export const formatWalletTransaction = (t) => {
  if (!t) return null;
  return {
    _id: t.id,
    id: t.id,
    creatorId: t.creator_id,
    collaborationId: t.collaboration_id,
    campaignId: t.campaign_id,
    payoutId: t.payout_id,
    withdrawalId: t.withdrawal_id,
    type: t.type,
    transaction_type: t.transaction_type,
    amount: Number(t.amount || 0),
    currency: t.currency || "INR",
    status: t.status,
    description: t.description,
    referenceId: t.reference_id,
    balanceAfter: Number(t.balance_after || 0),
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
};

export const formatWithdrawal = (w) => {
  if (!w) return null;
  return {
    _id: w.id,
    id: w.id,
    creatorId: w.creator_id,
    amount: Number(w.amount || 0),
    currency: w.currency || "INR",
    status: w.status,
    withdrawalMethod: w.withdrawal_method,
    bankDetailsSnapshot:
      typeof w.bank_details_snapshot === "string"
        ? JSON.parse(w.bank_details_snapshot)
        : w.bank_details_snapshot || {},
    referenceId: w.reference_id,
    payoutReference: w.payout_reference,
    failureReason: w.failure_reason,
    adminNotes: w.admin_notes,
    requestedAt: w.requested_at,
    processedAt: w.processed_at,
    completedAt: w.completed_at,
    createdAt: w.created_at,
    updatedAt: w.updated_at,
  };
};

export const formatConnection = (c) => {
  if (!c) return null;
  return {
    _id: c.id,
    id: c.id,
    creatorId: c.creator_id,
    brandId: c.brand_id,
    campaignId: c.campaign_id,
    pitch: c.pitch,
    appliedTier: typeof c.applied_tier === "string" ? JSON.parse(c.applied_tier) : c.applied_tier || {},
    status: c.status || "pending",
    creatorNotificationSeen: Boolean(c.creator_notification_seen),
    collaborationStatus: c.collaboration_status || "NEGOTIATING",
    creatorAmount: Number(c.creator_amount || 0),
    pravixoFee: Number(c.pravixo_fee || 0),
    brandTotal: Number(c.brand_total || 0),
    proposedAmount: Number(c.proposed_amount || 0),
    proposedBy: c.proposed_by,
    agreedAt: c.agreed_at,
    paymentStatus: c.payment_status || "PENDING",
    paymentId: c.payment_id,
    paidAt: c.paid_at,
    deliverablesTracking:
      typeof c.deliverables_tracking === "string"
        ? JSON.parse(c.deliverables_tracking)
        : c.deliverables_tracking || [],
    allDeliverablesCompleted: Boolean(c.all_deliverables_completed),
    workCompletedAt: c.work_completed_at,
    approvalCompletedAt: c.approval_completed_at,
    paymentReleaseEligibleAt: c.payment_release_eligible_at,
    paymentReleaseStatus: c.payment_release_status || "NOT_APPLICABLE",
    adminNotifiedOfEligibility: Boolean(c.admin_notified_of_eligibility),
    barterDetails:
      typeof c.barter_details === "string" ? JSON.parse(c.barter_details) : c.barter_details || {},
    payoutId: c.payout_id,
    payoutReleasedAt: c.payout_released_at,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
};

export const formatNotification = (n) => {
  if (!n) return null;
  return {
    _id: n.id,
    id: n.id,
    recipientId: n.recipient_id,
    senderId: n.sender_id,
    type: n.type,
    text: n.text,
    taskId: n.task_id,
    targetUrl: n.target_url || "",
    metadata: typeof n.metadata === "string" ? JSON.parse(n.metadata) : n.metadata || null,
    read: Boolean(n.read),
    createdAt: n.created_at || (n.created_at_dt ? new Date(n.created_at_dt).getTime() : Date.now()),
    updatedAt: n.updated_at_dt,
  };
};

export const formatSubmission = (s) => {
  if (!s) return null;
  return {
    _id: s.id,
    id: s.id,
    connectionId: s.connection_id,
    campaignId: s.campaign_id,
    brandId: s.brand_id,
    creatorId: s.creator_id,
    deliverableId: s.deliverable_id,
    deliverableType: s.deliverable_type,
    contentUrl: s.content_url,
    cloudinaryPublicId: s.cloudinary_public_id,
    caption: s.caption || "",
    status: s.status || "SUBMITTED",
    version: Number(s.version || 1),
    parentSubmissionId: s.parent_submission_id,
    reworkCount: Number(s.rework_count || 0),
    rejectionReason: s.rejection_reason || "",
    approvedAt: s.approved_at,
    rejectedAt: s.rejected_at,
    resubmittedAt: s.resubmitted_at,
    submittedAt: s.submitted_at,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
};

export const formatPayment = (p) => {
  if (!p) return null;
  return {
    _id: p.id,
    id: p.id,
    campaignId: p.campaign_id,
    connectionId: p.connection_id,
    brandId: p.brand_id,
    creatorId: p.creator_id,
    conversationId: p.conversation_id,
    paymentGateway: p.payment_gateway,
    gatewayOrderId: p.gateway_order_id,
    gatewayPaymentId: p.gateway_payment_id,
    gatewaySignature: p.gateway_signature,
    gatewayStatus: p.gateway_status,
    gatewayWebhookStatus: p.gateway_webhook_status,
    gatewayResponse: p.gateway_response,
    invoiceNumber: p.invoice_number,
    invoiceStatus: p.invoice_status,
    transactionReference: p.transaction_reference,
    paymentMethod: p.payment_method,
    currency: p.currency || "INR",
    grossAmount: Number(p.gross_amount || 0),
    platformCommissionPercentage: Number(p.platform_commission_percentage || 0),
    platformCommissionAmount: Number(p.platform_commission_amount || 0),
    creatorAmount: Number(p.creator_amount || 0),
    holdingStatus: p.holding_status || "inactive",
    holdingStartedAt: p.holding_started_at,
    holdingEndsAt: p.holding_ends_at,
    releasedAt: p.released_at,
    refundStatus: p.refund_status || "inactive",
    refundAmount: Number(p.refund_amount || 0),
    refundReason: p.refund_reason,
    payoutStatus: p.payout_status,
    payoutReference: p.payout_reference,
    creatorBankAccountId: p.creator_bank_account_id,
    paymentStatus: p.payment_status || "pending",
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
};

export const formatAgreement = (a) => {
  if (!a) return null;
  return {
    _id: a.id,
    id: a.id,
    agreementId: a.agreement_id,
    collaborationId: a.collaboration_id,
    campaignId: a.campaign_id,
    brandId: a.brand_id,
    creatorId: a.creator_id,
    version: Number(a.version || 1),
    status: a.status || "GENERATED",
    brandSnapshot: typeof a.brand_snapshot === "string" ? JSON.parse(a.brand_snapshot) : a.brand_snapshot || {},
    creatorSnapshot: typeof a.creator_snapshot === "string" ? JSON.parse(a.creator_snapshot) : a.creator_snapshot || {},
    campaignSnapshot: typeof a.campaign_snapshot === "string" ? JSON.parse(a.campaign_snapshot) : a.campaign_snapshot || {},
    deliverablesSnapshot: typeof a.deliverables_snapshot === "string" ? JSON.parse(a.deliverables_snapshot) : a.deliverables_snapshot || [],
    financialsSnapshot: typeof a.financials_snapshot === "string" ? JSON.parse(a.financials_snapshot) : a.financials_snapshot || {},
    terms: typeof a.terms === "string" ? JSON.parse(a.terms) : a.terms || [],
    signatureStatus: a.signature_status || "PENDING_SIGNATURES",
    brandSignature: typeof a.brand_signature === "string" ? JSON.parse(a.brand_signature) : a.brand_signature || {},
    creatorSignature: typeof a.creator_signature === "string" ? JSON.parse(a.creator_signature) : a.creator_signature || {},
    adminSignature: typeof a.admin_signature === "string" ? JSON.parse(a.admin_signature) : a.admin_signature || {},
    fullySignedAt: a.fully_signed_at,
    pdfUrl: a.pdf_url || "",
    pdfPublicId: a.pdf_public_id || "",
    pdfGeneratedAt: a.pdf_generated_at,
    pdfVersion: a.pdf_version,
    generatedAt: a.generated_at,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
};

export const formatBankDetails = (b) => {
  if (!b) return null;
  return {
    _id: b.id,
    id: b.id,
    creatorId: b.creator_id,
    fullName: b.full_name,
    phone: b.phone,
    email: b.email,
    bankName: b.bank_name,
    accountHolderName: b.account_holder_name,
    accountNumber: b.account_number,
    ifsc: b.ifsc,
    upiId: b.upi_id,
    panNumber: b.pan_number,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
};

export const formatPortfolio = (p) => {
  if (!p) return null;
  return {
    _id: p.id,
    id: p.id,
    profileId: p.profile_id,
    imageUrl: p.image_url,
    url: p.image_url,
    cloudinaryPublicId: p.cloudinary_public_id,
    mediaType: p.media_type || "image",
    type: p.type || "post",
    caption: p.caption || "",
    brandTag: p.brand_tag || "",
    likesCount: Number(p.likes_count || 0),
    viewsCount: Number(p.views_count || 0),
    commentsCount: Number(p.comments_count || 0),
    sharesCount: Number(p.shares_count || 0),
    aspectRatio: p.aspect_ratio || "1:1",
    sortOrder: Number(p.sort_order || 0),
    likedByUsers: typeof p.liked_by_users === "string" ? JSON.parse(p.liked_by_users) : p.liked_by_users || [],
    comments: typeof p.comments === "string" ? JSON.parse(p.comments) : p.comments || [],
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
};

export const formatCampaignTask = (t) => {
  if (!t) return null;
  return {
    _id: t.id,
    id: t.id,
    campaignId: t.campaign_id,
    creatorId: t.creator_id,
    brandId: t.brand_id,
    connectionId: t.connection_id,
    conversationId: t.conversation_id,
    title: t.title,
    description: t.description,
    deliverables: t.deliverables,
    priority: t.priority,
    status: t.status,
    dueDate: Number(t.due_date || 0),
    startedAt: t.started_at ? Number(t.started_at) : null,
    completedAt: t.completed_at ? Number(t.completed_at) : null,
    submissionLink: t.submission_link,
    notes: t.notes,
    attachmentLink: t.attachment_link,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
};

export const formatContactInquiry = (c) => {
  if (!c) return null;
  return {
    _id: c.id,
    id: c.id,
    name: c.name,
    email: c.email,
    subject: c.subject,
    message: c.message,
    status: c.status,
    adminNotes: c.admin_notes || "",
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
};

export const formatFollow = (f) => {
  if (!f) return null;
  return {
    _id: f.id,
    id: f.id,
    followerId: f.follower_id,
    followingId: f.following_id,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  };
};

export const formatOffer = (o) => {
  if (!o) return null;
  return {
    _id: o.id,
    id: o.id,
    creatorId: o.creator_id,
    brandId: o.brand_id,
    creatorOrBrandType: o.creator_or_brand_type,
    offerTitle: o.offer_title,
    conditionText: o.condition_text,
    offerCategory: o.offer_category,
    discountPercent: o.discount_percent ? Number(o.discount_percent) : null,
    monetaryBonus: o.monetary_bonus ? Number(o.monetary_bonus) : null,
    validityHours: Number(o.validity_hours || 0),
    expiresAt: o.expires_at,
    status: o.status,
    rejectionReason: o.rejection_reason || "",
    approvedBy: o.approved_by,
    approvedAt: o.approved_at,
    deletedBy: o.deleted_by,
    deletedAt: o.deleted_at,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
};

export const formatSubscriptionPackage = (p) => {
  if (!p) return null;
  return {
    _id: p.id,
    id: p.id,
    name: p.name,
    price: Number(p.price || 0),
    originalPrice: Number(p.original_price || 0),
    billingPeriod: p.billing_period,
    badge: p.badge || "",
    features: typeof p.features === "string" ? JSON.parse(p.features) : p.features || [],
    active: Boolean(p.active),
    targetRole: p.target_role || "both",
    sortOrder: Number(p.sort_order || 0),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
};

export const formatSubscriptionOffer = (o) => {
  if (!o) return null;
  return {
    _id: o.id,
    id: o.id,
    name: o.name,
    description: o.description,
    discountPercentage: o.discount_percentage ? Number(o.discount_percentage) : null,
    discountAmount: o.discount_amount ? Number(o.discount_amount) : null,
    bannerImageUrl: o.banner_image_url,
    bannerStorageId: o.banner_storage_id,
    expiryDate: Number(o.expiry_date || 0),
    buttonText: o.button_text,
    targetUsers: o.target_users,
    packageId: o.package_id,
    active: Boolean(o.active),
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
};

export const formatOfferAnalytics = (a) => {
  if (!a) return null;
  return {
    _id: a.id,
    id: a.id,
    offerId: a.offer_id,
    views: Number(a.views || 0),
    clicks: Number(a.clicks || 0),
    upgrades: Number(a.upgrades || 0),
    revenue: Number(a.revenue || 0),
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
};

export const formatUserSubscription = (s) => {
  if (!s) return null;
  return {
    _id: s.id,
    id: s.id,
    profileId: s.profile_id,
    packageId: s.package_id,
    offerId: s.offer_id,
    startDate: Number(s.start_date || 0),
    expiryDate: s.expiry_date ? Number(s.expiry_date) : null,
    status: s.status,
    amountPaid: Number(s.amount_paid || 0),
    razorpayOrderId: s.razorpay_order_id,
    razorpayPaymentId: s.razorpay_payment_id,
    razorpaySignature: s.razorpay_signature,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
};

export const formatPopupSetting = (p) => {
  if (!p) return null;
  return {
    _id: p.id,
    id: p.id,
    showPopup: Boolean(p.show_popup),
    popupFrequency: p.popup_frequency,
    targetUsers: p.target_users,
    popupExpiry: p.popup_expiry ? Number(p.popup_expiry) : null,
    activeOfferId: p.active_offer_id,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
};

export const formatProTip = (t) => {
  if (!t) return null;
  return {
    _id: t.id,
    id: t.id,
    title: t.title,
    content: t.content,
    category: t.category || "",
    image: t.image || "",
    iconName: t.icon_name || "Lightbulb",
    author: t.author || "",
    isPublished: Boolean(t.is_published),
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
};

export const formatTrustReview = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    source: r.source,
    reviewerName: r.reviewer_name,
    reviewText: r.review_text,
    rating: Number(r.rating || 0),
    createdAt: r.created_at,
  };
};

export const formatVideoReview = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    thumbnailUrl: r.thumbnail_url,
    videoUrl: r.video_url,
    reviewerName: r.reviewer_name,
    reviewerAvatar: r.reviewer_avatar || "",
    reviewerId: r.reviewer_id,
    targetId: r.target_id,
    targetName: r.target_name || "",
    targetAvatar: r.target_avatar || "",
    campaignName: r.campaign_name || "",
    reviewType: r.review_type || "video",
    reviewText: r.review_text,
    rating: Number(r.rating || 5),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export const formatReferralRelationship = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    referrerProfileId: r.referrer_profile_id,
    referredProfileId: r.referred_profile_id,
    referralCode: r.referral_code,
    status: r.status,
    registeredAt: r.registered_at,
    firstDealCompletedAt: r.first_deal_completed_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

export const formatReferralSetting = (s) => {
  if (!s) return null;
  return {
    _id: s.id,
    id: s.id,
    creatorRewardAmount: Number(s.creator_reward_amount || 0),
    brandRewardAmount: Number(s.brand_reward_amount || 0),
    commissionPercent: Number(s.commission_percent || 0),
    programActive: Boolean(s.program_active),
    rewardTrigger: s.reward_trigger || "first_completed_deal",
    updatedBy: s.updated_by,
    updatedAt: s.updated_at,
  };
};

export const formatReferralReward = (r) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    referralId: r.referral_id,
    recipientProfileId: r.recipient_profile_id,
    amount: Number(r.amount || 0),
    currency: r.currency || "INR",
    status: r.status,
    creditedAt: r.credited_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

