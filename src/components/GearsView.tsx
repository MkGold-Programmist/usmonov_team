import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  ChevronLeft,
  Share2,
  Check,
  ShoppingBag,
  Plus,
  Minus,
  ShieldCheck,
} from 'lucide-react';
import {
  BLUEPRINT_CONSTRAINTS,
  filterAndSortProducts,
  formatCurrency,
  type GearProduct,
} from '../utils/storeLogic';
import type { TranslationStrings } from '../utils/i18n';
import { ProductVisual } from './ProductVisual';

const CATEGORY_LABELS: Record<string, string> = {
  Accessories: 'Борцовки',
  Apparel: 'Трико',
  'Shin Guards': 'Наколенники',
  Headgear: 'Защита ушей',
  Gloves: 'Перчатки',
};

interface GearsViewProps {
  products: GearProduct[];
  selectedProduct: GearProduct | null;
  t: TranslationStrings;
  onSelectProduct: (product: GearProduct | null) => void;
  onAddToCart: (product: GearProduct, size: string, variant: string, quantity: number) => void;
}

export const GearsView: React.FC<GearsViewProps> = ({
  products,
  selectedProduct,
  t,
  onSelectProduct,
  onAddToCart,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [copiedShare, setCopiedShare] = useState(false);

  const filteredProducts = filterAndSortProducts(products, {
    category: selectedCategory,
    searchQuery,
    sortBy,
  });

  // PRODUCT DETAIL PAGE (PDP)
  if (selectedProduct) {
    const sizesList = selectedProduct.sizes
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const activeSize = selectedSize || sizesList[0] || 'Standard';
    const similarProducts = products
      .filter((p) => p.id !== selectedProduct.id)
      .slice(0, 3);

    const handleShare = () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).catch(() => {});
      }
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="space-y-6 sm:space-y-10 pb-12"
      >
        <div className="flex items-center justify-between border-b border-[#E6DEC8] pb-4">
          <button
            type="button"
            onClick={() => {
              setSelectedSize('');
              setQuantity(1);
              onSelectProduct(null);
            }}
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFFFF] hover:border-[#1C1917] text-xs font-semibold text-[#1C1917] flex items-center gap-1.5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[#C2410C]" />
            <span>{t.backToShop}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFFFF] hover:border-[#1C1917] text-xs font-medium text-[#57534E] hover:text-[#1C1917] flex items-center gap-1.5 transition-colors"
          >
            {copiedShare ? (
              <Check className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span>{copiedShare ? 'Скопировано' : 'Поделиться'}</span>
          </button>
        </div>

        {/* Contiguous Purchase Module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          <div className="lg:col-span-6 rounded-2xl border border-[#E6DEC8] bg-[#FFFFFF] overflow-hidden shadow-sm">
            <div className="aspect-[4/3] bg-[#FFFFFF]">
              <ProductVisual
                imageKey={selectedProduct.imageKey}
                alt={selectedProduct.name}
                category={CATEGORY_LABELS[selectedProduct.category] || selectedProduct.category}
              />
            </div>
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-[#E6DEC8] bg-[#FFFFFF] p-5 sm:p-8 space-y-5 sm:space-y-6 shadow-sm">
            <div className="space-y-2 border-b border-[#F0E9DA] pb-4 sm:pb-5">
              <div className="flex items-center gap-2 text-xs text-[#78716C]">
                <span className="font-medium text-[#9A5B13]">
                  {CATEGORY_LABELS[selectedProduct.category] || selectedProduct.category}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#15803D] font-medium">
                  {selectedProduct.stock > 0
                    ? `${selectedProduct.stock} ${t.inStock}`
                    : t.outOfStock}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-display font-semibold text-[#1C1917]">
                {selectedProduct.name}
              </h1>

              <p className="text-xl sm:text-2xl font-mono font-semibold text-[#C2410C] tabular-nums pt-1">
                {formatCurrency(selectedProduct.price)}
              </p>

              <p className="text-xs text-[#57534E] pt-0.5">{selectedProduct.variants}</p>
            </div>

            <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
              {selectedProduct.description}
            </p>

            {/* Size Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#1C1917]">
                {t.selectSize}
              </label>
              <div className="flex flex-wrap gap-2">
                {sizesList.map((sz) => {
                  const isChosen = activeSize === sz;
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        isChosen
                          ? 'bg-[#1C1917] text-[#FAF6F0]'
                          : 'bg-[#FAF6F0] text-[#57534E] border border-[#D6CBB5] hover:border-[#1C1917] hover:text-[#1C1917]'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quantity & Add to Bag */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <div className="flex items-center justify-between rounded-xl border border-[#D6CBB5] bg-[#FAF6F0] px-2 min-h-[46px]">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#57534E] hover:text-[#1C1917]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 sm:px-4 font-mono text-sm font-semibold text-[#1C1917] tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() =>
                    setQuantity((q) => Math.min(selectedProduct.stock || 10, q + 1))
                  }
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#57534E] hover:text-[#1C1917]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={selectedProduct.stock <= 0}
                onClick={() =>
                  onAddToCart(
                    selectedProduct,
                    activeSize,
                    selectedProduct.variants,
                    quantity
                  )
                }
                className="flex-1 min-h-[46px] px-5 py-3 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-40 text-white font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>
                  {t.addToBag} · {formatCurrency(selectedProduct.price * quantity)}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        <div className="space-y-4 pt-6 border-t border-[#E6DEC8]">
          <h2 className="text-lg sm:text-xl font-display font-semibold text-[#1C1917]">
            {t.similarProducts}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
            {similarProducts.map((sim) => (
              <article
                key={sim.id}
                className="rounded-2xl border border-[#E6DEC8] bg-[#FFFFFF] overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSize('');
                    setQuantity(1);
                    onSelectProduct(sim);
                  }}
                  className="text-left block w-full"
                >
                  <div className="aspect-[4/3] bg-[#FFFFFF] border-b border-[#F3EDE2] overflow-hidden">
                    <ProductVisual
                      imageKey={sim.imageKey}
                      alt={sim.name}
                      category={CATEGORY_LABELS[sim.category] || sim.category}
                    />
                  </div>
                  <div className="p-3 sm:p-4 space-y-1">
                    <h3 className="text-xs sm:text-sm font-display font-semibold text-[#1C1917] line-clamp-2 leading-snug">
                      {sim.name}
                    </h3>
                    <p className="text-xs sm:text-sm font-mono font-semibold text-[#C2410C] tabular-nums">
                      {formatCurrency(sim.price)}
                    </p>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  // STORE CATALOG VIEW
  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[#E6DEC8] pb-5 sm:pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#B45309]">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Официальная экипировка для ковра · Доставка по Худжанду</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-semibold text-[#1C1917]">
            {t.shopSectionTitle}
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="relative flex-1 sm:min-w-[260px]">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full min-h-[42px] pl-10 pr-4 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFFFF] text-xs text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#C2410C]"
            />
          </div>

          <select
            aria-label="Sort products"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="min-h-[42px] px-3.5 py-2 rounded-xl border border-[#D6CBB5] bg-[#FFFFFF] text-xs text-[#1C1917] focus:outline-none focus:border-[#C2410C]"
          >
            <option value="featured">Рекомендуемые</option>
            <option value="price-asc">Цена: по возрастанию (с.)</option>
            <option value="price-desc">Цена: по убыванию (с.)</option>
            <option value="name">По названию</option>
          </select>
        </div>
      </div>

      {/* Category Filter Tabs (Smooth horizontal swipe on phones, wrap on tablet/desktop) */}
      <div
        role="tablist"
        aria-label="Product categories"
        className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 sm:flex-wrap"
      >
        {(['All', ...BLUEPRINT_CONSTRAINTS.CATEGORIES.filter((c) => products.some((p) => p.category === c))] as const).map((cat) => {
          const isSelected = selectedCategory === cat;
          const catCount = cat === 'All' ? products.length : products.filter((p) => p.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[38px] px-3 sm:px-4 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'bg-[#1C1917] text-[#FAF6F0] font-semibold'
                  : 'bg-[#FFFFFF] text-[#57534E] border border-[#E6DEC8] hover:border-[#1C1917] hover:text-[#1C1917]'
              }`}
            >
              {cat === 'All'
                ? `${t.allCategories} (${catCount})`
                : `${CATEGORY_LABELS[cat] || cat} (${catCount})`}
            </button>
          );
        })}
      </div>

      {/* Product Grid (2-col on Mobile for effortless browsing, 3-col on Tablet/Desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-6">
        {filteredProducts.map((product, idx) => {
          const firstSize =
            product.sizes
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)[0] || 'Standard';

          return (
            <motion.article
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.02 }}
              className="group rounded-2xl border border-[#E6DEC8] bg-[#FFFFFF] overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 shadow-[0_10px_28px_-14px_rgba(28,25,23,0.07)]"
            >
              <div>
                <button
                  type="button"
                  onClick={() => onSelectProduct(product)}
                  className="w-full aspect-[4/3] bg-[#FFFFFF] border-b border-[#F3EDE2] overflow-hidden block text-left"
                >
                  <ProductVisual
                    imageKey={product.imageKey}
                    alt={product.name}
                    category={CATEGORY_LABELS[product.category] || product.category}
                  />
                </button>

                <div className="p-3 sm:p-4 lg:p-5 space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-[#78716C] truncate">
                    <span className="font-medium text-[#9A5B13]">
                      {CATEGORY_LABELS[product.category] || product.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#15803D] font-medium truncate">
                      {product.stock > 0 ? `${product.stock} ${t.inStock}` : t.outOfStock}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="text-left block w-full"
                  >
                    <h2 className="text-xs sm:text-base lg:text-lg font-display font-semibold text-[#1C1917] hover:text-[#C2410C] transition-colors line-clamp-2 min-h-[2rem] sm:min-h-[2.75rem] leading-snug">
                      {product.name}
                    </h2>
                  </button>

                  <p className="hidden sm:block text-xs text-[#57534E] line-clamp-1">{product.variants}</p>

                  <p className="text-sm sm:text-lg font-mono font-semibold text-[#C2410C] tabular-nums pt-0.5">
                    {formatCurrency(product.price)}
                  </p>
                </div>
              </div>

              <div className="px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5">
                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={() =>
                    onAddToCart(product, firstSize, product.variants, 1)
                  }
                  className="w-full min-h-[38px] sm:min-h-[42px] px-2.5 sm:px-4 py-2 rounded-xl bg-[#1C1917] hover:bg-[#C2410C] disabled:opacity-40 text-[11px] sm:text-xs font-semibold text-[#FAF6F0] transition-colors whitespace-nowrap"
                >
                  {product.stock > 0 ? t.addToBag : t.outOfStock}
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
};
