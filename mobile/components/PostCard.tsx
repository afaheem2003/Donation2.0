import React, { useState } from "react";
import {
  View, Text, Image, TouchableOpacity, TextInput,
  StyleSheet, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { api, FeedPost, Comment } from "@/lib/api";
import { formatCents, timeAgo, COLORS } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface PostCardProps {
  post: FeedPost;
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  async function toggleLike() {
    if (!user) { router.push("/auth/signin"); return; }
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    try { await api.posts.like(post.id); } catch { /* optimistic */ }
  }

  async function loadComments() {
    if (showComments) { setShowComments(false); return; }
    setLoadingComments(true);
    try {
      const data = await api.posts.getComments(post.id);
      setComments(data);
    } catch (e) {
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

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => router.push(`/profile/${post.user.username}` as never)}
      >
        {post.user.avatarUrl ? (
          <Image source={{ uri: post.user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>{post.user.name?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
        )}
        <View>
          <Text style={styles.userName}>{post.user.name ?? post.user.username}</Text>
          <Text style={styles.timeAgo}>{timeAgo(post.createdAt)}</Text>
        </View>
      </TouchableOpacity>

      {/* Donation badge */}
      {post.donation && (
        <TouchableOpacity
          style={styles.donationBadge}
          onPress={() => router.push(`/nonprofit/${post.nonprofit.id}` as never)}
        >
          <Text style={styles.donationText}>
            💚 Donated {formatCents(post.donation.amountCents, post.donation.currency)} to{" "}
            <Text style={styles.nonprofitName}>{post.nonprofit.name}</Text>
            {post.nonprofit.verified ? " ✓" : ""}
          </Text>
        </TouchableOpacity>
      )}

      {/* Image */}
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleLike}>
          <Text style={{ fontSize: 20 }}>{liked ? "❤️" : "🤍"}</Text>
          <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={loadComments}>
          <Text style={{ fontSize: 20 }}>💬</Text>
          <Text style={styles.actionCount}>{post.commentCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <View style={styles.captionRow}>
        <Text style={styles.captionUser}>{post.user.name ?? post.user.username} </Text>
        <Text style={styles.caption}>{post.caption}</Text>
      </View>

      {/* Comments section */}
      {showComments && (
        <View style={styles.commentsSection}>
          {loadingComments ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : (
            <>
              {comments.map((c) => (
                <View key={c.id} style={styles.commentRow}>
                  <Text style={styles.commentUser}>{c.user.name ?? c.user.username} </Text>
                  <Text style={styles.commentBody}>{c.body}</Text>
                </View>
              ))}
              {user && (
                <View style={styles.commentInput}>
                  <TextInput
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="Add a comment..."
                    placeholderTextColor={COLORS.gray400}
                    style={styles.commentTextField}
                    returnKeyType="send"
                    onSubmitEditing={submitComment}
                  />
                  <TouchableOpacity onPress={submitComment} disabled={!commentText.trim()}>
                    <Text style={[styles.postBtn, !commentText.trim() && styles.postBtnDisabled]}>
                      Post
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    marginBottom: 8,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: {
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.brand, fontWeight: "700", fontSize: 14 },
  userName: { fontWeight: "700", fontSize: 13, color: COLORS.gray900 },
  timeAgo: { fontSize: 11, color: COLORS.gray400, marginTop: 1 },
  donationBadge: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#fdf2f8",
    borderRadius: 10,
    padding: 10,
  },
  donationText: { fontSize: 13, color: COLORS.brandDark },
  nonprofitName: { fontWeight: "700" },
  postImage: { width: "100%", aspectRatio: 1 },
  actions: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionCount: { fontSize: 13, color: COLORS.gray600, fontWeight: "600" },
  actionCountLiked: { color: COLORS.red },
  captionRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingBottom: 12 },
  captionUser: { fontWeight: "700", fontSize: 13, color: COLORS.gray900 },
  caption: { fontSize: 13, color: COLORS.gray800, flex: 1 },
  commentsSection: { borderTopWidth: 1, borderTopColor: COLORS.gray100, padding: 12 },
  loadingText: { color: COLORS.gray400, fontSize: 12 },
  commentRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  commentUser: { fontWeight: "700", fontSize: 12, color: COLORS.gray900 },
  commentBody: { fontSize: 12, color: COLORS.gray700 },
  commentInput: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  commentTextField: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    color: COLORS.gray900,
  },
  postBtn: { fontSize: 13, fontWeight: "700", color: COLORS.brand },
  postBtnDisabled: { color: COLORS.gray300 },
});
