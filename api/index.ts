import accountsDelete from './_routes/accounts/delete';
import accountsDetail from './_routes/accounts/detail';
import accountsList from './_routes/accounts/list';
import accountsResetPassword from './_routes/accounts/reset-password';
import accountsUpdate from './_routes/accounts/update';
import featuresEnforce from './_routes/features/enforce';
import featuresSettings from './_routes/features/settings';
import razorpayConfig from './_routes/razorpay/config';
import razorpayPlans from './_routes/razorpay/plans';
import razorpaySubscriptions from './_routes/razorpay/subscriptions';
import razorpayWebhook from './_routes/razorpay/webhook';
import rbacEnforce from './_routes/rbac/enforce';
import rbacPolicies from './_routes/rbac/policies';

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
  const pathname = rawUrl.split('?')[0].replace(/\/$/, '');

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
