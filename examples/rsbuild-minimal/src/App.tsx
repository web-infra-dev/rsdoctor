import './App.css';
import './semver';
import './semver7';
import { useEffect, useMemo, useState } from 'react';
import { mockOrders, mockProducts, Order } from './mock/shop';

type RouteState =
  | { name: 'products' }
  | { name: 'product'; id: string }
  | { name: 'order' }
  | { name: 'checkout' };

function parseHashRoute(hash: string): RouteState {
  const normalized = hash.replace(/^#/, '') || '/products';
  const segments = normalized.split('/').filter(Boolean);

  if (segments[0] === 'product' && segments[1]) {
    return { name: 'product', id: segments[1] };
  }
  if (segments[0] === 'order') {
    return { name: 'order' };
  }
  if (segments[0] === 'checkout') {
    return { name: 'checkout' };
  }
  return { name: 'products' };
}

function StatusTag({ status }: { status: Order['status'] }) {
  return (
    <span className={`status status-${status}`}>{status.toUpperCase()}</span>
  );
}

const App = () => {
  // Dynamically import shared.ts to make it an async chunk
  // @ts-expect-error - Dynamic import for testing splitChunk behavior
  import('./utils/shared').then(() => {
    console.log('Shared module loaded as async chunk');
  });

  const [route, setRoute] = useState<RouteState>(
    parseHashRoute(window.location.hash),
  );
  const [checkoutProductId, setCheckoutProductId] = useState<string>(
    mockProducts[0].id,
  );

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = '/products';
    }
    const onHashChange = () => {
      setRoute(parseHashRoute(window.location.hash));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const checkoutProduct = useMemo(
    () =>
      mockProducts.find((item) => item.id === checkoutProductId) ??
      mockProducts[0],
    [checkoutProductId],
  );

  const renderPage = () => {
    if (route.name === 'products') {
      return (
        <section className="page">
          <h2>商品页</h2>
          <p className="hint">Demo mock 商品列表（点击查看详情或直接下单）</p>
          <div className="grid">
            {mockProducts.map((item) => (
              <article key={item.id} className="card">
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
                <div className="meta">
                  <span>¥{item.price}</span>
                  <span>库存: {item.stock}</span>
                </div>
                <div className="actions">
                  <a href={`#/product/${item.id}`}>详情页</a>
                  <a
                    href="#/checkout"
                    onClick={() => {
                      setCheckoutProductId(item.id);
                    }}
                  >
                    下单页
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (route.name === 'product') {
      const product = mockProducts.find((item) => item.id === route.id);
      if (!product) {
        return (
          <section className="page">
            <h2>详情页</h2>
            <p className="hint">未找到商品：{route.id}</p>
            <a href="#/products">返回商品页</a>
          </section>
        );
      }
      return (
        <section className="page">
          <h2>详情页</h2>
          <article className="detail">
            <h3>{product.name}</h3>
            <p>{product.desc}</p>
            <ul>
              <li>商品 ID: {product.id}</li>
              <li>分类: {product.category}</li>
              <li>价格: ¥{product.price}</li>
              <li>库存: {product.stock}</li>
            </ul>
            <div className="actions">
              <a href="#/products">返回商品页</a>
              <a
                href="#/checkout"
                onClick={() => {
                  setCheckoutProductId(product.id);
                }}
              >
                立即下单
              </a>
            </div>
          </article>
        </section>
      );
    }

    if (route.name === 'order') {
      return (
        <section className="page">
          <h2>订单页</h2>
          <p className="hint">Demo mock 订单列表</p>
          <div className="list">
            {mockOrders.map((order) => (
              <article key={order.id} className="order-item">
                <div>
                  <strong>{order.id}</strong>
                  <p>
                    {order.itemCount} 件商品 | 创建时间: {order.createdAt}
                  </p>
                </div>
                <div className="order-right">
                  <StatusTag status={order.status} />
                  <span>¥{order.total}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="page">
        <h2>下单页</h2>
        <p className="hint">Demo mock 结算信息</p>
        <article className="detail">
          <h3>{checkoutProduct.name}</h3>
          <ul>
            <li>商品 ID: {checkoutProduct.id}</li>
            <li>单价: ¥{checkoutProduct.price}</li>
            <li>数量: 1</li>
            <li>合计: ¥{checkoutProduct.price}</li>
          </ul>
          <button
            className="primary-btn"
            onClick={() => {
              window.alert(`下单成功（mock）：${checkoutProduct.name}`);
            }}
          >
            提交订单
          </button>
        </article>
      </section>
    );
  };

  return (
    <div className="shell">
      <header className="top-nav">
        <h1>Rsbuild Minimal Mall Demo</h1>
        <nav>
          <a href="#/products">商品页</a>
          <a href="#/order">订单页</a>
          <a href="#/checkout">下单页</a>
        </nav>
      </header>
      {renderPage()}
    </div>
  );
};

export default App;
