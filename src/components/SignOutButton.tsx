export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className="underline underline-offset-4">
        Sign out
      </button>
    </form>
  );
}
