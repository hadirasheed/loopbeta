export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post" className="inline">
      <button type="submit" className="underline-offset-4 hover:underline">
        Sign out
      </button>
    </form>
  );
}
