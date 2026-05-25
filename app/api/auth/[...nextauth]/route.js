import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import Owner from '@/models/Owner';

export const dynamic = 'force-dynamic';

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        await dbConnect();
        const owner = await Owner.findOne({ email: credentials.email.toLowerCase() });
        if (!owner) return null;
        const isValid = await owner.comparePassword(credentials.password);
        if (!isValid) return null;
        return {
          id: owner._id.toString(),
          name: owner.name,
          email: owner.email,
          gymName: owner.gymName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.gymName = user.gymName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.gymName = token.gymName;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
