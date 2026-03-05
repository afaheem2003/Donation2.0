import React, { useState, useRef } from "react";
import {
  Animated, View, Text, Image, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Dimensions,
  Modal, KeyboardAvoidingView, Platform, Switch, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, FeedPost, Comment } from "@/lib/api";
import { formatCents, timeAgo, COLORS } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface PostCardProps {
  post: FeedPost;
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const navigating = useRef(false);
  const heartScale = useRef(new Animated.Value(1)).current;

  // Feed interaction state
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Owner management state
  const [deleted, setDeleted] = useState(false);
  const [currentCaption, setCurrentCaption] = useState(post.caption);
  const [currentAllowComments, setCurrentAllowComments] = useState(post.allowComments);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [editAllowComments, setEditAllowComments] = useState(post.allowComments);
  const [updating, setUpdating] = useState(false);

  const isOwnPost = user?.username === post.user.username;

  if (deleted) return null;

  // ── Follow ────────────────────────────────────────────────────────────────

  async function toggleFollow() {
    if (!user) { router.push("/auth/signin"); return; }
    setFollowLoading(true);
    try {
      const res = await api.users.follow(post.user.username);
      setFollowing(res.following);
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  }

  // ── Like ─────────────────────────────────────────────────────────────────

  async function toggleLike() {
    if (!user) { router.push("/auth/signin"); return; }
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true, speed: 40, bounciness: 12 }),
      Animated.spring(heartScale, { toValue: 1.0, useNativeDriver: true, speed: 40, bounciness: 4 }),
    ]).start();
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    try { await api.posts.like(post.id); } catch { /* optimistic */ }
  }

  // ── Comments ──────────────────────────────────────────────────────────────

  async function loadComments() {
    if (showComments) { setShowComments(false); return; }
    setLoadingComments(true);
    try {
      const data = await api.posts.getComments(post.id);
      setComments(data);
    } catch {
      Alert.alert("Error", "Could not load comments");
    } finally {
      setLoadingComments(false);
      setShowComments(true);
    }
  }

  async function submitComment() {
    if (!commentText.trim() || !user) return;
    try {
      const comment = await api.posts.addComment(post.id, commentText.trim());
      setComments([...comments, comment]);
      setCommentText("");
    } catch {
      Alert.alert("Error", "Could not post comment");
    }
  }

  // ── Owner menu ────────────────────────────────────────────────────────────

  function openMenu() {
    Alert.alert("Post options", "", [
      {
        text: "Edit post",
        onPress: () => {
          setEditCaption(currentCaption);
          setEditAllowComments(currentAllowComments);
          setEditModalVisible(true);
        },
      },
      {
        text: "Delete post",
        style: "destructive",
        onPress: confirmDelete,
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function confirmDelete() {
    Alert.alert("Delete post?", "This will remove your post from the feed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.posts.delete(post.id);
            setDeleted(true);
          } catch {
            Alert.alert("Error", "Could not delete post.");
          }
        },
      },
    ]);
  }

  async function submitEdit() {
    if (!editCaption.trim()) return;
    setUpdating(true);
    try {
      await api.posts.update(post.id, {
        caption: editCaption.trim(),
        allowComments: editAllowComments,
      });
      setCurrentCaption(editCaption.trim());
      setCurrentAllowComments(editAllowComments);
      setEditModalVisible(false);
    } catch {
      Alert.alert("Error", "Could not update post.");
    } finally {
      setUpdating(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const initials = post.user.name?.[0]?.toUpperCase() ?? post.user.username[0]?.toUpperCase() ?? "?";

  return (
    <>
      <View style={styles.card}>
        {/* ── Header ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.header}
          onPress={() => {
            if (navigating.current) return;
            navigating.current = true;
            router.push(`/profile/${post.user.username}` as never);
            setTimeout(() => { navigating.current = false; }, 800);
          }}
        >
          <View style={styles.avatarRing}>
            {post.user.avatarUrl ? (
              <Image source={{ uri: post.user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.userName}>{post.user.name ?? post.user.username}</Text>
            <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
          </View>
          {isOwnPost ? (
            <TouchableOpacity style={styles.menuBtn} onPress={openMenu} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.gray400} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={toggleFollow}
              disabled={followLoading}
              activeOpacity={0.8}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={following ? COLORS.gray600 : COLORS.white} style={{ width: 50 }} />
              ) : (
                <Text style={[styles.followBtnText, following && styles.followBtnTextActive]}>
                  {following ? "Following" : "Follow"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* ── Post image ─────────────────────────────────────────── */}
        {post.imageUrl && (
          <View>
            <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
            {post.donation && (
              <TouchableOpacity
                style={styles.donationOverlay}
                onPress={() => router.push(`/nonprofit/${post.nonprofit.id}` as never)}
                activeOpacity={0.9}
              >
                <Ionicons name="heart-circle" size={18} color={COLORS.white} />
                <Text style={styles.donationOverlayAmount}>
                  {formatCents(post.donation.amountCents, post.donation.currency)}
                </Text>
                <Text style={styles.donationOverlayTo}>
                  to {post.nonprofit.name}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Donation badge when no image */}
        {!post.imageUrl && post.donation && (
          <TouchableOpacity
            style={styles.donationBadge}
            onPress={() => router.push(`/nonprofit/${post.nonprofit.id}` as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="heart-circle" size={28} color={COLORS.brand} />
            <View style={styles.donationBadgeText}>
              <Text style={styles.donationAmount}>
                {formatCents(post.donation.amountCents, post.donation.currency)}
              </Text>
              <Text style={styles.donationLabel}>
                to <Text style={styles.nonprofitName}>{post.nonprofit.name}</Text>
              </Text>
            </View>
            {post.nonprofit.verified && (
              <Ionicons name="checkmark-circle" size={16} color={COLORS.brand} />
            )}
          </TouchableOpacity>
        )}

        {/* ── Actions row ────────────────────────────────────────── */}
        <View style={styles.actions}>
          <View style={styles.actionsLeft}>
            <TouchableOpacity onPress={toggleLike} activeOpacity={0.7}>
              <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={26}
                  color={liked ? COLORS.red : COLORS.gray900}
                />
              </Animated.View>
            </TouchableOpacity>
            {currentAllowComments && (
              <TouchableOpacity onPress={loadComments} activeOpacity={0.7} style={styles.actionWithCount}>
                <Ionicons name="chatbubble-outline" size={24} color={COLORS.gray900} />
                {post.commentCount > 0 && (
                  <Text style={styles.actionCount}>{post.commentCount}</Text>
                )}
              </TouchableOpacity>
            )}
            {!currentAllowComments && (
              <View style={styles.commentsOffBadge}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.gray300} />
              </View>
            )}
          </View>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="bookmark-outline" size={24} color={COLORS.gray900} />
          </TouchableOpacity>
        </View>

        {/* ── Like count ─────────────────────────────────────────── */}
        {likeCount > 0 && (
          <Text style={styles.likeCountText}>
            {likeCount.toLocaleString()} {likeCount === 1 ? "like" : "likes"}
          </Text>
        )}

        {/* ── Caption ────────────────────────────────────────────── */}
        {currentCaption ? (
          <View style={styles.captionRow}>
            <Text style={styles.captionText}>
              <Text style={styles.captionUser}>{post.user.name ?? post.user.username}</Text>
              {"  "}{currentCaption}
            </Text>
          </View>
        ) : null}

        {/* ── Comments disabled notice ────────────────────────────── */}
        {!currentAllowComments && (
          <Text style={styles.commentsOffText}>Comments are turned off</Text>
        )}

        {/* ── View comments link ─────────────────────────────────── */}
        {currentAllowComments && post.commentCount > 0 && !showComments && (
          <TouchableOpacity onPress={loadComments} style={styles.viewCommentsBtn}>
            <Text style={styles.viewCommentsText}>
              View {post.commentCount === 1 ? "1 comment" : `all ${post.commentCount} comments`}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Comments section ───────────────────────────────────── */}
        {currentAllowComments && showComments && (
          <View style={styles.commentsSection}>
            {loadingComments ? (
              <ActivityIndicator size="small" color={COLORS.gray400} style={{ padding: 8 }} />
            ) : (
              <>
                {comments.map((c) => {
                  const cInitial = c.user.name?.[0]?.toUpperCase() ?? c.user.username[0]?.toUpperCase() ?? "?";
                  return (
                    <View key={c.id} style={styles.commentRow}>
                      <View style={styles.commentAvatar}>
                        <Text style={styles.commentAvatarText}>{cInitial}</Text>
                      </View>
                      <Text style={[styles.commentText, { flex: 1 }]}>
                        <Text style={styles.commentUser}>{c.user.name ?? c.user.username}</Text>
                        {"  "}{c.body}
                      </Text>
                    </View>
                  );
                })}
                {user && (
                  <View style={styles.commentInput}>
                    <TextInput
                      value={commentText}
                      onChangeText={setCommentText}
                      placeholder="Add a comment..."
                      placeholderTextColor={COLORS.gray300}
                      style={styles.commentTextField}
                      returnKeyType="send"
                      onSubmitEditing={submitComment}
                    />
                    {commentText.trim() ? (
                      <TouchableOpacity onPress={submitComment}>
                        <Text style={styles.postBtnText}>Post</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </View>

      {/* ── Edit modal ───────────────────────────────────────────── */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.editModal}>
            {/* Handle */}
            <View style={styles.editHandle} />

            {/* Header */}
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit Post</Text>
              <TouchableOpacity
                style={styles.editCloseBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={COLORS.gray500} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.editScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Caption input */}
              <TextInput
                value={editCaption}
                onChangeText={setEditCaption}
                placeholder="Write about your donation..."
                placeholderTextColor={COLORS.gray300}
                multiline
                style={styles.editCaptionInput}
                autoFocus
              />

              {/* Allow comments toggle */}
              <View style={styles.editToggleRow}>
                <View style={styles.editToggleLeft}>
                  <Ionicons name="chatbubble-outline" size={16} color={COLORS.gray600} />
                  <View>
                    <Text style={styles.editToggleLabel}>Allow comments</Text>
                    <Text style={styles.editToggleSub}>Let others respond to this post</Text>
                  </View>
                </View>
                <Switch
                  value={editAllowComments}
                  onValueChange={setEditAllowComments}
                  trackColor={{ false: COLORS.gray200, true: COLORS.brandLight }}
                  thumbColor={editAllowComments ? COLORS.brand : COLORS.gray300}
                />
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.editFooter}>
              <TouchableOpacity
                style={styles.editDeleteBtn}
                onPress={() => { setEditModalVisible(false); confirmDelete(); }}
              >
                <Ionicons name="trash-outline" size={15} color={COLORS.red} />
                <Text style={styles.editDeleteBtnText}>Delete post</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.editSaveBtn,
                  (!editCaption.trim() || updating) && styles.editSaveBtnDisabled,
                ]}
                onPress={submitEdit}
                disabled={!editCaption.trim() || updating}
              >
                {updating ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.editSaveBtnText}>Update Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    marginBottom: 2,
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.brand,
    padding: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarFallback: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.brandDark, fontWeight: "700", fontSize: 13 },
  headerText: { flex: 1 },
  userName: { fontWeight: "700", fontSize: 13.5, color: COLORS.gray900 },
  timeAgo: { fontSize: 11, color: COLORS.gray400, marginTop: 1 },
  menuBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  followBtn: {
    backgroundColor: COLORS.brand,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followBtnActive: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  followBtnText: { fontSize: 13, fontWeight: "700", color: COLORS.white },
  followBtnTextActive: { color: COLORS.gray900 },

  // ── Image ───────────────────────────────────────────────────
  postImage: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
  },
  donationOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  donationOverlayAmount: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.white,
  },
  donationOverlayTo: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },

  // ── Donation badge (no image) ───────────────────────────────
  donationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: COLORS.brandLight,
    padding: 12,
    borderRadius: 14,
  },
  donationBadgeText: { flex: 1 },
  donationAmount: { fontSize: 15, fontWeight: "800", color: COLORS.gray900 },
  donationLabel: { fontSize: 12, color: COLORS.gray500, marginTop: 1 },
  nonprofitName: { fontWeight: "600", color: COLORS.gray700 },

  // ── Actions ─────────────────────────────────────────────────
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  actionsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionWithCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gray700,
  },
  commentsOffBadge: { opacity: 0.3 },

  // ── Like count ──────────────────────────────────────────────
  likeCountText: {
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray900,
    marginBottom: 4,
  },

  // ── Caption ─────────────────────────────────────────────────
  captionRow: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },
  captionText: {
    fontSize: 13,
    color: COLORS.gray700,
    lineHeight: 18,
  },
  captionUser: {
    fontWeight: "700",
    color: COLORS.gray900,
  },

  // ── Comments off ────────────────────────────────────────────
  commentsOffText: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    fontSize: 12,
    color: COLORS.gray400,
  },

  // ── Comments ────────────────────────────────────────────────
  viewCommentsBtn: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  viewCommentsText: {
    fontSize: 13,
    color: COLORS.gray400,
  },
  commentsSection: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  commentRow: {
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  commentAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.gray100,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  commentAvatarText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.gray500,
  },
  commentText: {
    fontSize: 13,
    color: COLORS.gray700,
    lineHeight: 18,
  },
  commentUser: {
    fontWeight: "700",
    color: COLORS.gray900,
  },
  commentInput: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingTop: 10,
  },
  commentTextField: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray900,
    paddingVertical: 4,
  },
  postBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.brand,
  },

  // ── Edit modal ──────────────────────────────────────────────
  editModal: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingTop: 12,
  },
  editHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.gray200, alignSelf: "center", marginBottom: 16,
  },
  editHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, marginBottom: 16,
  },
  editTitle: { fontSize: 17, fontWeight: "800", color: COLORS.gray900 },
  editCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.gray100, alignItems: "center", justifyContent: "center",
  },
  editScrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  editCaptionInput: {
    borderWidth: 1.5, borderColor: COLORS.gray200, borderRadius: 14,
    padding: 14, fontSize: 15, color: COLORS.gray900,
    minHeight: 120, textAlignVertical: "top", marginBottom: 14,
  },
  editToggleRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, gap: 12,
  },
  editToggleLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  editToggleLabel: { fontSize: 14, fontWeight: "600", color: COLORS.gray800 },
  editToggleSub: { fontSize: 12, color: COLORS.gray400, marginTop: 1 },
  editFooter: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 10,
  },
  editDeleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#FECDCA", backgroundColor: "#FEF3F2",
  },
  editDeleteBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.red },
  editSaveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.brand, borderRadius: 14, paddingVertical: 15,
    shadowColor: COLORS.brand, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  editSaveBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  editSaveBtnText: { fontSize: 15, fontWeight: "800", color: COLORS.white },
});
