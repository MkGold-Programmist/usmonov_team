/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Home,
  Dumbbell,
  ShoppingBag,
  Globe,
  ShieldCheck,
  Send,
  Phone,
} from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  CLUB_CONTACT,
  calculateCartTotals,
  summarizeCartItems,
  buildTelegramOrderMessage,
  type CartItem,
  type CustomerOrder,
  type FighterProfile,
  type GearProduct,
  type SportCourse,
  type TelegramBotOrderMessage,
} from './utils/storeLogic';
import {
  INITIAL_COURSES,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_BOT_MESSAGES,
} from './data/seedData';
import { TRANSLATIONS, type AppLanguage } from './utils/i18n';
import { HomeView } from './components/HomeView';
import { CoursesView } from './components/CoursesView';
import { GearsView } from './components/GearsView';
import { CartDrawer } from './components/CartDrawer';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { UsmonovTeamEmblem } from './components/ProductVisual';

export type ActiveTab = 'home' | 'courses' | 'shop';

const STORAGE_KEYS = {
  PRODUCTS: 'usmonovtime_products_v2',
  COURSES: 'usmonovtime_courses_v3',
  ORDERS: 'usmonovtime_orders_v1',
  BOT_MESSAGES: 'usmonovtime_bot_messages_v1',
  CART: 'usmonovtime_cart_v2',
  PROFILE: 'usmonovtime_profile_v2',
  LANG: 'usmonovtime_lang_v1',
};

const DEFAULT_PROFILE: FighterProfile = {
  uid: 'visitor_account',
  displayName: '',
  email: '',
  weightClass: 'Вольная Борьба',
  experienceLevel: 'Intermediate',
  activeProgram: 'Вольная Борьба — 1-й зал Худжанд',
  shippingAddress: '',
  phone: '',
  phoneVerified: false,
  createdAt: '2026-11-01T12:00:00Z',
  updatedAt: '2026-11-01T12:00:00Z',
};

export default function App() {
  const [lang, setLang] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LANG) as AppLanguage | null;
      if (saved === 'ru' || saved === 'tj' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'ru';
  });

  const t = TRANSLATIONS[lang];

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedProduct, setSelectedProduct] = useState<GearProduct | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [products, setProducts] = useState<GearProduct[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_PRODUCTS;
  });

  const [courses, setCourses] = useState<SportCourse[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COURSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_COURSES;
  });

  const [orders, setOrders] = useState<CustomerOrder[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_ORDERS;
  });

  const [botMessages, setBotMessages] = useState<TelegramBotOrderMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOT_MESSAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_BOT_MESSAGES;
  });

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CART);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        product: INITIAL_PRODUCTS[0],
        selectedSize: '42',
        selectedVariant: INITIAL_PRODUCTS[0].variants,
        quantity: 1,
      },
    ];
  });

  const [profile, setProfile] = useState<FighterProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_PROFILE;
  });

  // Persist local state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LANG, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch {
      // ignore
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
    } catch {
      // ignore
    }
  }, [courses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BOT_MESSAGES, JSON.stringify(botMessages));
    } catch {
      // ignore
    }
  }, [botMessages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cartItems));
    } catch {
      // ignore
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (user) {
        setProfile((prev) => ({
          ...prev,
          uid: user.uid,
          displayName: user.displayName || prev.displayName,
          email: user.email || prev.email,
        }));
      }
    });
    return () => unsub();
  }, []);

  // Authoritative server catalog + real-time SSE stream synced with @UsmonovTeamBot
  useEffect(() => {
    let active = true;

    const applyCatalogSnapshot = (nextProducts: GearProduct[]) => {
      if (!active || !Array.isArray(nextProducts)) return;
      setProducts(nextProducts);
      setSelectedProduct((prev) =>
        prev ? nextProducts.find((p) => p.id === prev.id) || null : null
      );
      setCartItems((prev) =>
        prev
          .map((item) => {
            const fresh = nextProducts.find((p) => p.id === item.product.id);
            if (!fresh) return null;
            return {
              ...item,
              product: fresh,
              quantity:
                fresh.stock > 0 ? Math.min(item.quantity, fresh.stock) : item.quantity,
            };
          })
          .filter((item): item is CartItem => item !== null)
      );
    };

    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.ok && Array.isArray(data.products)) {
          applyCatalogSnapshot(data.products);
        }
      })
      .catch(() => {
        // Offline / fallback to cached localStorage or seed catalog
      });

    let eventSource: EventSource | null = null;
    if (typeof EventSource !== 'undefined') {
      eventSource = new EventSource('/api/products/stream');
      eventSource.addEventListener('catalog', (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent).data);
          if (Array.isArray(payload?.products)) {
            applyCatalogSnapshot(payload.products);
          }
        } catch {
          // Ignore malformed SSE chunk
        }
      });
    }

    const coursesQuery = query(collection(db, 'courses'), where('priceSomoni', '>=', 0));
    const unsubCourses = onSnapshot(
      coursesQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudCourses: SportCourse[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              title: String(d.title || ''),
              sportType: String(d.sportType || ''),
              schedule: String(d.schedule || ''),
              coach: String(d.coach || ''),
              level: String(d.level || ''),
              priceSomoni: Number(d.priceSomoni || 0),
              imageKey: String(d.imageKey || ''),
              description: String(d.description || ''),
              updatedBy: String(d.updatedBy || ''),
              createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
              updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            };
          });
          setCourses(cloudCourses);
        }
      },
      (error) => {
        console.warn('Courses snapshot fallback:', error.message);
      }
    );

    return () => {
      active = false;
      eventSource?.close();
      unsubCourses();
    };
  }, []);

  // Sync authenticated user's orders & profile
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', currentUser.uid));
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudOrders: CustomerOrder[] = snapshot.docs.map((docSnap) => {
            const d = docSnap.data();
            return {
              id: docSnap.id,
              userId: String(d.userId || currentUser.uid),
              customerName: String(d.customerName || ''),
              itemsSummary: String(d.itemsSummary || ''),
              itemCount: Number(d.itemCount || 1),
              totalAmount: Number(d.totalAmount || 0),
              orderType: d.orderType || 'gear',
              status: d.status || 'pending',
              createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
              updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            };
          });
          setOrders(cloudOrders);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    );

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubUser = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const d = docSnap.data();
          setProfile((prev) => ({
            uid: currentUser.uid,
            displayName: String(d.displayName || currentUser.displayName || 'Fighter'),
            email: String(d.email || currentUser.email || ''),
            weightClass: String(d.weightClass || 'Вольная Борьба'),
            experienceLevel: d.experienceLevel || 'Intermediate',
            activeProgram: String(d.activeProgram || 'Вольная Борьба — Худжанд'),
            shippingAddress: String(d.shippingAddress || ''),
            phone: String(d.phone || prev.phone),
            phoneVerified: prev.phoneVerified,
            createdAt: d.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
            updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          }));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
      }
    );

    return () => {
      unsubOrders();
      unsubUser();
    };
  }, [authReady, currentUser]);

  // Handlers
  const handleSignInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.warn('Google sign-in popup closed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Sign-out error:', error);
    }
  };

  const handleAddToCart = (
    product: GearProduct,
    size: string,
    variant: string,
    quantity: number
  ) => {
    if (product.stock <= 0) return;
    setCartItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.selectedSize === size
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          product,
          quantity: Math.min(product.stock, updated[existingIndex].quantity + quantity),
        };
        return updated;
      }
      return [
        ...prev,
        {
          product,
          selectedSize: size,
          selectedVariant: variant,
          quantity: Math.min(product.stock, quantity),
        },
      ];
    });
    setIsCartOpen(true);
  };

  const handleQuickAdd = (product: GearProduct) => {
    const firstSize =
      product.sizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)[0] || 'Standard';
    handleAddToCart(product, firstSize, product.variants, 1);
  };

  const handleUpdateCartQuantity = (index: number, delta: number) => {
    setCartItems((prev) => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      const maxStock = Math.max(1, target.product.stock);
      const newQty = Math.min(maxStock, target.quantity + delta);
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      next[index] = { ...target, quantity: newQty };
      return next;
    });
  };

  const handleRemoveCartItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVerifyProfileInline = (
    verifiedName: string,
    verifiedPhone: string,
    address: string
  ) => {
    setProfile((prev) => ({
      ...prev,
      displayName: verifiedName,
      phone: verifiedPhone,
      shippingAddress: address || prev.shippingAddress,
      phoneVerified: true,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleCheckoutViaTelegramBot = async (
    promoCode: string,
    verifiedName: string,
    verifiedPhone: string,
    shippingAddress: string
  ): Promise<TelegramBotOrderMessage | null> => {
    const totals = calculateCartTotals(cartItems, promoCode);
    if (totals.itemCount === 0) return null;

    const orderId = `ord_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const summaryWithPhone = `${summarizeCartItems(cartItems)} [Тел: ${verifiedPhone}]`.slice(
      0,
      500
    );

    const newOrder: CustomerOrder = {
      id: orderId,
      userId: currentUser?.uid || profile.uid,
      customerName: verifiedName.slice(0, 100),
      itemsSummary: summaryWithPhone,
      itemCount: totals.itemCount,
      totalAmount: totals.total,
      orderType: 'gear',
      status: 'pending',
      verifiedPhone,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const localFormatted = buildTelegramOrderMessage({
      orderId,
      customerName: verifiedName,
      verifiedPhone,
      shippingAddress,
      itemsSummary: summarizeCartItems(cartItems),
      totalAmount: totals.total,
      promoCode,
    });

    let botReceipt: TelegramBotOrderMessage = {
      id: `bot_msg_${Date.now()}`,
      orderId,
      customerName: verifiedName,
      verifiedPhone,
      shippingAddress,
      itemsSummary: summarizeCartItems(cartItems),
      totalAmount: totals.total,
      verificationBadge: localFormatted.verificationBadge,
      botText: localFormatted.botText,
      botReplyText: localFormatted.botReplyText,
      telegramDeepLink: localFormatted.telegramDeepLink,
      createdAt: nowIso,
      deliveredViaApi: false,
    };

    try {
      const resp = await fetch('/api/telegram/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          customerName: verifiedName,
          phone: verifiedPhone,
          otpVerified: true,
          shippingAddress,
          itemsSummary: summarizeCartItems(cartItems),
          items: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          totalAmount: totals.total,
          promoCode,
        }),
      });
      const data = await resp.json();
      if (!resp.ok && data?.error) {
        throw new Error(data.error);
      }
      if (resp.ok && Array.isArray(data?.products)) {
        setProducts(data.products);
      }
      if (resp.ok && data?.botText) {
        botReceipt = {
          ...botReceipt,
          botText: data.botText,
          botReplyText: data.botReplyText,
          verificationBadge: data.verificationBadge,
          telegramDeepLink: data.telegramDeepLink,
          deliveredViaApi: Boolean(data.deliveredViaApi),
        };
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Анти-спам')) {
        throw err;
      }
    }

    setOrders((prev) => [newOrder, ...prev]);
    setBotMessages((prev) => [botReceipt, ...prev]);
    setCartItems([]);

    if (currentUser && currentUser.emailVerified) {
      try {
        await setDoc(doc(db, 'orders', orderId), {
          userId: currentUser.uid,
          customerName: newOrder.customerName,
          itemsSummary: newOrder.itemsSummary,
          itemCount: newOrder.itemCount,
          totalAmount: newOrder.totalAmount,
          orderType: newOrder.orderType,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
      }
    }

    return botReceipt;
  };

  const handleSaveProfile = async (updated: FighterProfile) => {
    setProfile(updated);
    if (currentUser && currentUser.emailVerified) {
      const userPath = `users/${currentUser.uid}`;
      try {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          {
            uid: currentUser.uid,
            displayName: updated.displayName.slice(0, 100),
            email: (currentUser.email || updated.email).slice(0, 150),
            weightClass: updated.weightClass.slice(0, 60),
            experienceLevel: updated.experienceLevel,
            activeProgram: updated.activeProgram.slice(0, 100),
            shippingAddress: updated.shippingAddress.slice(0, 250),
            phone: updated.phone.slice(0, 40),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, userPath);
      }
    }
  };

  const totalBagCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#1C1917] flex flex-col">
      <OfflineIndicator />

      {/* TOP BAR CONTRACT: 3 ZONES (Zone 1: UsmonovTeam Brand, Zone 2: 3 Nav Links, Zone 3: 1 Primary Bag Action) */}
      <header className="sticky top-0 z-40 h-14 md:h-16 border-b border-[#E6DEC8] bg-[#FAF6F0]/95 backdrop-blur-md px-3.5 sm:px-6 lg:px-8 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Single Brand Wordmark Link */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            setSelectedProduct(null);
            setActiveTab('home');
          }}
          className="text-lg sm:text-2xl font-display font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0"
        >
          UsmonovTeam
        </a>

        {/* Zone 2: 3 Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]"
        >
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setSelectedProduct(null);
              setActiveTab('home');
            }}
            className={`hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'home'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#C2410C]'
                : ''
            }`}
          >
            {t.navHome}
          </a>
          <a
            href="#courses"
            onClick={(e) => {
              e.preventDefault();
              setSelectedProduct(null);
              setActiveTab('courses');
            }}
            className={`hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'courses'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#C2410C]'
                : ''
            }`}
          >
            {t.navCourses}
          </a>
          <a
            href="#shop"
            onClick={(e) => {
              e.preventDefault();
              setSelectedProduct(null);
              setActiveTab('shop');
            }}
            className={`hover:text-[#1C1917] transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'shop'
                ? 'text-[#1C1917] font-semibold border-b-2 border-[#C2410C]'
                : ''
            }`}
          >
            {t.navShop}
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <button
          type="button"
          onClick={() => setIsCartOpen(true)}
          className="min-h-[38px] md:min-h-[40px] px-3.5 md:px-4 py-1.5 md:py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>
            {t.bagButton} ({totalBagCount})
          </span>
        </button>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1240px] mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-5 lg:pt-6 pb-4 md:pb-12 overflow-x-hidden">
        {/* Compact Sub-Header Toolbar: Single clean row on Mobile, Venue Details + Switcher on Tablet/Desktop */}
        <div className="flex items-center justify-between gap-2.5 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-[#E6DEC8]">
          <div className="flex items-center gap-2 text-xs text-[#57534E] min-w-0">
            <UsmonovTeamEmblem className="hidden sm:block w-6 h-6 shrink-0" />
            <div className="flex items-center gap-x-2 min-w-0 truncate">
              <span className="hidden md:inline font-semibold text-[#1C1917]">UsmonovTeam</span>
              <span aria-hidden="true" className="hidden md:inline text-[#A8A29E]">·</span>
              <span className="hidden sm:inline text-[#78716C]">{t.cityLabel}</span>
              <span aria-hidden="true" className="hidden sm:inline text-[#A8A29E]">·</span>
              <a
                href={CLUB_CONTACT.phoneHref}
                className="inline-flex items-center gap-1 font-mono font-semibold text-[#1C1917] hover:text-[#C2410C] transition-colors whitespace-nowrap shrink-0"
              >
                <Phone className="w-3.5 h-3.5 text-[#C2410C]" />
                <span>{CLUB_CONTACT.phoneShort}</span>
              </a>
              <span aria-hidden="true" className="hidden xs:inline text-[#A8A29E]">·</span>
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#9A5B13] hover:text-[#1C1917] transition-colors truncate"
              >
                {profile.phoneVerified ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                    <span className="text-[#15803D] font-semibold truncate">
                      {profile.displayName} ({profile.phone})
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-[#C2410C] shrink-0" />
                    <span className="truncate">{CLUB_CONTACT.botUsername}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div
            role="group"
            aria-label="Language switcher"
            className="inline-flex items-center gap-0.5 p-0.5 sm:p-1 rounded-xl bg-[#F3EDE2] border border-[#E6DEC8] shrink-0"
          >
            <Globe className="hidden sm:block w-3.5 h-3.5 text-[#78716C] ml-1.5 mr-0.5 shrink-0" />
            {(
              [
                { id: 'ru', label: 'РУС' },
                { id: 'tj', label: 'ТОҶ' },
                { id: 'en', label: 'ENG' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLang(item.id)}
                className={`min-h-[28px] sm:min-h-[30px] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap ${
                  lang === item.id
                    ? 'bg-[#1C1917] text-[#FAF6F0] font-semibold shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'home' && (
          <HomeView
            products={products}
            courses={courses}
            t={t}
            phoneVerified={Boolean(profile.phoneVerified)}
            verifiedName={profile.displayName}
            verifiedPhone={profile.phone}
            onNavigateGears={() => {
              setSelectedProduct(null);
              setActiveTab('shop');
            }}
            onNavigateCourses={() => {
              setSelectedProduct(null);
              setActiveTab('courses');
            }}
            onOpenCart={() => setIsCartOpen(true)}
            onVerifyProfileInline={handleVerifyProfileInline}
            onSelectProduct={(prod) => {
              setSelectedProduct(prod);
              setActiveTab('shop');
            }}
            onQuickAdd={handleQuickAdd}
          />
        )}

        {activeTab === 'courses' && <CoursesView courses={courses} t={t} />}

        {activeTab === 'shop' && (
          <GearsView
            products={products}
            selectedProduct={selectedProduct}
            t={t}
            onSelectProduct={setSelectedProduct}
            onAddToCart={handleAddToCart}
          />
        )}
      </main>

      {/* Quiet Responsive Footer (Clean layout on Mobile above bottom bar + Full row on Tablet/Desktop) */}
      <footer className="border-t border-[#E6DEC8] bg-[#F3EDE2] py-6 md:py-8 px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-[1240px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-[#57534E]">
          <div className="flex items-start sm:items-center gap-3">
            <UsmonovTeamEmblem className="w-6 h-6 shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">
              © 2026 UsmonovTeam · 1-й Зал вольной борьбы и экипировки · Владелец и тренер: {CLUB_CONTACT.ownerName} · г. Худжанд.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-5">
            <a
              href={CLUB_CONTACT.phoneHref}
              className="font-mono font-semibold text-[#1C1917] hover:text-[#C2410C] flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 text-[#C2410C]" />
              <span>{CLUB_CONTACT.phoneFormatted}</span>
            </a>
            <a
              href={CLUB_CONTACT.botUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#9A5B13] hover:text-[#1C1917] font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{CLUB_CONTACT.botUsername}</span>
            </a>
            <PWAInstallButton compact />
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Optimized for 320px - 767px screens: <= 15% sticky cap) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-[60px] bg-[#FAF6F0]/95 backdrop-blur-md border-t border-[#E6DEC8] grid grid-cols-3 px-1 pb-safe"
      >
        {(
          [
            { id: 'home', label: t.navHome, icon: Home },
            { id: 'courses', label: t.navCourses, icon: Dumbbell },
            { id: 'shop', label: t.navShop, icon: ShoppingBag },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedProduct(null);
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] py-1 transition-colors ${
                isActive ? 'text-[#C2410C]' : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[11px] font-semibold tracking-tight text-center truncate max-w-[100px] px-0.5">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Shopping Bag Slide-Over Drawer with Inline Phone OTP & @UsmonovTimeBot Checkout */}
      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        profile={profile}
        t={t}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onVerifyProfileInline={handleVerifyProfileInline}
        onCheckoutViaTelegramBot={handleCheckoutViaTelegramBot}
      />
    </div>
  );
}
