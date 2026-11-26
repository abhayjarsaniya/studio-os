import accountsDelete from '../server/routes/accounts/delete';
import accountsDetail from '../server/routes/accounts/detail';
import accountsList from '../server/routes/accounts/list';
import accountsResetPassword from '../server/routes/accounts/reset-password';
import accountsUpdate from '../server/routes/accounts/update';
import featuresEnforce from '../server/routes/features/enforce';
import featuresSettings from '../server/routes/features/settings';
import razorpayConfig from '../server/routes/razorpay/config';
import razorpayPlans from '../server/routes/razorpay/plans';
import razorpaySubscriptions from '../server/routes/razorpay/subscriptions';
import razorpayWebhook from '../server/routes/razorpay/webhook';
import rbacEnforce from '../server/routes/rbac/enforce';
import rbacPolicies from '../server/routes/rbac/policies';

const routes: Record<string, (req: any, res: any) => Promise<any>> = {
  '/api/accounts/delete': accountsDelete,
  '/api/accounts/detail': accountsDetail,
  '/api/accounts/list': accountsList,
  '/api/accounts/reset-password': accountsResetPassword,
  '/api/accounts/update': accountsUpdate,
  '/api/features/enforce': featuresEnforce,
  '/api/features/settings': featuresSettings,
  '/api/razorpay/config': razorpayConfig,
  '/api/razorpay/plans': razorpayPlans,
  '/api/razorpay/subscriptions': razorpaySubscriptions,
  '/api/razorpay/webhook': razorpayWebhook,
  '/api/rbac/enforce': rbacEnforce,
  '/api/rbac/policies': rbacPolicies,
};

export default async function handler(req: any, res: any) {
  // Normalize pathname by stripping query parameters and trailing slash
  const rawUrl = req.url || '';
  let pathname = rawUrl.split('?')[0].replace(/\/$/, '');

  // Check if route was rewritten with query param `path` (e.g. /api/index?path=...)
  if (req.query && req.query.path) {
    const qPath = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
    const candidate = qPath.startsWith('/api') ? qPath : `/api/${qPath.replace(/^\//, '')}`;
    if (routes[candidate]) {
      return routes[candidate](req, res);
    }
  }

  // Check x-matched-path header from Vercel
  const matchedPathHeader = req.headers && (req.headers['x-matched-path'] || req.headers['x-forwarded-path']);
  if (matchedPathHeader && typeof matchedPathHeader === 'string') {
    const cleanHeaderPath = matchedPathHeader.split('?')[0].replace(/\/$/, '');
    if (routes[cleanHeaderPath]) {
      return routes[cleanHeaderPath](req, res);
    }
  }

  const matched = routes[pathname];
  if (matched) {
    return matched(req, res);
  }

  // Also match without /api prefix if rewritten by platform
  const withApi = pathname.startsWith('/api') ? pathname : `/api${pathname}`;
  if (routes[withApi]) {
    return routes[withApi](req, res);
  }

  return res.status(404).json({
    success: false,
    error: `API endpoint "${pathname}" not found.`
  });
}
