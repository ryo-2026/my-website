export default function Avatar({ user, size = 32 }) {
  if (user?.photoURL) {
    return <img src={user.photoURL} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return <span style={{ fontSize: size * 0.8 }}>{user?.avatar || "🏃"}</span>;
}
