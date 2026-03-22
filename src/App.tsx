import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  doc, 
  setDoc, 
  User 
} from './firebase';
import { LogIn, LogOut, Send, User as UserIcon, MessageSquare, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Error handling helper
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Post {
  id: string;
  text: string;
  createdAt: any;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Update user profile in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          await setDoc(userRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Anonymous',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || '',
            lastLogin: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Error updating user profile:", error);
        }
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setPosts([]);
      return;
    }

    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleAddPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user || isPosting) return;

    setIsPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        text: newPost.trim(),
        createdAt: serverTimestamp(),
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || ''
      });
      setNewPost('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'posts');
    } finally {
      setIsPosting(false);
    }
  };

  if (appError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6">{appError}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-slate-100"
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Umoja Group</h1>
          <p className="text-slate-500 mb-8">Connect, share, and grow together in our community space.</p>
          
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl transition-all active:scale-95 shadow-md"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>
          
          <p className="mt-6 text-xs text-slate-400 uppercase tracking-widest font-medium">
            Secure • Real-time • Community
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Umoja Group</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate">
                {user.displayName}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 flex flex-col gap-6">
        {/* Post Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <form onSubmit={handleAddPost} className="flex flex-col gap-3">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full min-h-[100px] p-3 text-slate-800 placeholder-slate-400 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 resize-none transition-all"
              maxLength={1000}
            />
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-xs font-medium",
                newPost.length > 900 ? "text-orange-500" : "text-slate-400"
              )}>
                {newPost.length}/1000
              </span>
              <button
                type="submit"
                disabled={!newPost.trim() || isPosting}
                className="flex items-center gap-2 py-2 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-sm"
              >
                {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Post
              </button>
            </div>
          </form>
        </div>

        {/* Posts List */}
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Community Feed</h2>
          
          <AnimatePresence initial={false}>
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      {post.authorPhoto ? (
                        <img src={post.authorPhoto} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 leading-none mb-1">{post.authorName}</h3>
                      <p className="text-xs text-slate-400">
                        {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Just now'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <p className="text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                  {post.text}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          {posts.length === 0 && (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
              <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No posts yet. Be the first to share!</p>
            </div>
          )}
        </div>
      </main>
      
      <footer className="py-8 text-center text-slate-400 text-xs">
        &copy; {new Date().getFullYear()} Umoja Group • Built with AI Studio
      </footer>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
