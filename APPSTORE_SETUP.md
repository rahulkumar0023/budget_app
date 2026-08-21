# Budget Buddy App Store Release Setup

## ✅ Completed

- [x] Privacy Policy (PRIVACY.md updated with real contact)
- [x] Support Page (SUPPORT.md updated with FAQ)
- [x] Public URLs created (GitHub Pages)
- [x] App.json configured for iOS

## 🔗 Step 1: Enable GitHub Pages (5 minutes)

### Host Privacy & Support pages on GitHub Pages

1. **In GitHub repo settings:**
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/docs`
   - Click Save

2. **Wait 1-2 minutes for GitHub Pages to build**

3. **Your public URLs will be:**
   ```
   Privacy Policy: https://yourusername.github.io/budget-app/privacy.html
   Support Page:   https://yourusername.github.io/budget-app/support.html
   ```

4. **Test the URLs** — Visit them in your browser to verify they load

### Alternative: Firebase Hosting (if you prefer)
If you want to use Firebase instead:
```bash
npm install -g firebase-tools
firebase init hosting
firebase deploy
```

---

## 🎒 Step 2: Apple Developer Setup (10 minutes)

### Create Apple Developer Account
1. Go to [developer.apple.com](https://developer.apple.com)
2. Enroll in Apple Developer Program ($99/year)
3. Once enrolled, you'll access App Store Connect

### Create App in App Store Connect
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+"
3. Create new app:
   - Name: `Budget Buddy`
   - Primary Language: English
   - Bundle ID: `com.rahulkumar.budgetbuddy`
   - SKU: `com.rahulkumar.budgetbuddy`
   - Category: Finance
4. Click Create

### Fill in Basic Information
In App Store Connect → App Information:

**App Preview & Screenshots:**
- [ ] App Icon (1024×1024 PNG)
- [ ] Screenshots (see section below)

**Pricing & Availability:**
- [ ] Price: Free
- [ ] Availability: All territories (recommended)

**General App Information:**
- Subtitle: `Local-first budgets with smarter monthly reviews`
- Promotional text: `Plan the month clearly, track flexible spend, and recover your budget when you need it.`
- Description: (from APP_STORE_METADATA.md)
- Keywords: `budget,budgeting,expense tracker,monthly planner,savings,finance,spending`
- Support URL: `https://yourusername.github.io/budget-app/support.html`
- Privacy Policy URL: `https://yourusername.github.io/budget-app/privacy.html`
- Author: Your name
- Email: namrah.be@gmail.com

**Age Rating:**
- Tap "Age Rating Questionnaire"
- Answer all questions (should all be "None" or "Infrequent")
- Submit

---

## 💳 Step 3: RevenueCat Setup (15 minutes)

### Create RevenueCat Account
1. Go to [revenuecat.com](https://revenuecat.com)
2. Sign up with Google or email
3. Create new app: "Budget Buddy"
4. Platform: iOS

### Add iOS App to RevenueCat
1. Settings → iOS
2. Bundle ID: `com.rahulkumar.budgetbuddy`
3. Sandbox public API key: (you'll get this later from App Store Connect)

### Create Subscription Products in App Store Connect
In App Store Connect → Your App → In-App Purchases:

**Create Subscription Group:**
- Name: `Premium`
- Reference Name: `premium_group`

**Create Monthly Subscription:**
- Reference Name: `premium_monthly`
- Product ID: `premium_monthly`
- Auto-Renewable Subscription: Yes
- Subscription Group: Premium
- Duration: 1 Month
- Price: $0.99 (or your preferred price)
- Billing cycle: Monthly
- Free Trial: None (you can add later)

**Create Yearly Subscription:**
- Reference Name: `premium_yearly`
- Product ID: `premium_yearly`
- Auto-Renewable Subscription: Yes
- Subscription Group: Premium
- Duration: 1 Year
- Price: $7.99 (or your preferred price)
- Billing cycle: Yearly

### Link RevenueCat to App Store Connect
1. In App Store Connect → Users and Access → Keys
2. Create new API key for "App Store Server API"
3. Copy the key
4. In RevenueCat → Settings → iOS
5. Paste the App Store Server API key
6. Test the connection

### Create RevenueCat Products
1. RevenueCat → Products
2. Add iOS product: `premium_monthly` (map to App Store product)
3. Add iOS product: `premium_yearly` (map to App Store product)

### Create RevenueCat Offering
1. RevenueCat → Offerings
2. Create new offering: "current" (default)
3. Add packages:
   - Monthly: `premium_monthly`
   - Yearly: `premium_yearly`

### Get RevenueCat SDK Key
1. RevenueCat → Settings → API Keys
2. Copy "Public SDK key"
3. Save as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`

---

## 🔑 Step 4: Environment Variables

### Local Development
Create `.env` file in project root:
```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_public_sdk_key_here
```

### EAS Secrets (for App Store builds)
```bash
eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
# When prompted, paste your RevenueCat public SDK key
```

### Verify secrets are set
```bash
eas secret:list
```

---

## 📸 Step 5: App Store Screenshots

Create 5 iPhone 6.7" screenshots (1242 × 2688 px):

**Screenshot 1: Dashboard Overview**
- Show: Monthly budget, categories with progress bars
- Caption: "Set your monthly budget and track spending by category"

**Screenshot 2: Transaction Entry**
- Show: Adding a new expense, category picker
- Caption: "Log expenses quickly with category and account labels"

**Screenshot 3: Category Breakdown**
- Show: One category detail, planned vs spent
- Caption: "See exactly how much you've spent in each category"

**Screenshot 4: Settings & Premium**
- Show: Settings screen with Premium badge
- Caption: "Choose from 12 themes, 50+ currencies, and 28 languages"

**Screenshot 5: Data Export**
- Show: Export options (CSV, Excel, PDF)
- Caption: "Export your data anytime—your data, your control"

### Tools to create screenshots:
- **Figma:** Create mockup, export as PNG
- **Keynote:** Design on Mac, export slides as images
- **AppMockUp:** Online tool
- **Screenshot on iPhone:** Take real screenshots, add captions in Figma

### Upload to App Store Connect
In App Store Connect → Your App → App Preview & Screenshots:
- [ ] Upload 5 screenshots for iPhone 6.7" (Pro Max)
- [ ] Add captions for each (optional but recommended)
- [ ] Repeat for any other languages you want to support

---

## 🏗️ Step 6: EAS Build Configuration

### Initialize EAS (if not done)
```bash
eas build:configure
```

Select:
- Platform: iOS
- Build type: Generic

### Create production build locally
```bash
npm run typecheck      # Verify TypeScript
npx expo-doctor       # Check Expo setup
npm run build:ios     # Create production build
```

This will:
1. Prompt you to log in with Apple Developer account
2. Create provisioning profile automatically
3. Build the app
4. Take 5-10 minutes

### Monitor build progress
```bash
eas build --platform ios --profile production --status
```

---

## 🧪 Step 7: TestFlight Testing

### Upload to TestFlight
After build completes:
```bash
npm run submit:ios
```

This automatically:
1. Uploads build to TestFlight
2. Creates "Internal Testing" group

### Test on Device
1. Open TestFlight app on iPhone
2. Accept the build
3. Install Budget Buddy
4. **Full testing checklist** (see TESTING.md):
   - [ ] Dashboard loads
   - [ ] Add transaction works
   - [ ] Monthly summary calculates correctly
   - [ ] All themes load without crashing
   - [ ] Currency/language changes work
   - [ ] Sign-in flow works
   - [ ] Premium paywall displays
   - [ ] Restore purchases works
   - [ ] Backup toggle works (Premium only)
   - [ ] Export CSV works
   - [ ] No crashes for 5 minutes of use

### Test Premium Purchase
Use **sandbox Apple ID**:
1. Settings → [Your Name] → Subscriptions
2. TestFlight builds use Apple's sandbox environment
3. Purchases don't charge real money
4. Use `sandbox.test@gmail.com` as test email

### Fix bugs
If you find crashes:
1. Fix the bug in code
2. Run `npm run build:ios` again
3. Upload to TestFlight
4. Test the new build

---

## 📤 Step 8: Submit to App Store

### Final Checklist Before Submission
- [ ] `npm run typecheck` passes (no TypeScript errors)
- [ ] `npx expo-doctor` passes (no Expo issues)
- [ ] TestFlight build tested on real device
- [ ] No crashes found
- [ ] Privacy Policy URL is public and accessible
- [ ] Support URL is public and accessible
- [ ] Screenshots uploaded (at least 1 language)
- [ ] App icons are correct
- [ ] Metadata complete (subtitle, description, keywords)
- [ ] Age rating questionnaire completed
- [ ] RevenueCat products linked to App Store products

### Submit
```bash
npm run submit:ios
```

Status will appear in App Store Connect as "Waiting for Review"

---

## ⏳ What Happens Next

**1-2 days:** Apple reviews your app
**Potential outcomes:**
- ✅ Approved → Goes live on App Store
- ⚠️ Rejected → Fix issues, resubmit
- 📧 Questions → Respond within 24 hours

**Common rejections** (easily fixable):
- Missing privacy policy → Upload it
- Unclear Premium features → Use PremiumBadge consistently
- Broken links → Test all URLs
- Crashing on review device → Debug and resubmit

---

## 🎉 Launch!

Once approved:
1. Publish in App Store Connect
2. Share launch link with friends
3. Monitor reviews & ratings
4. Respond to support emails

**Post-launch goals:**
- 100+ downloads in first week
- 4.0+ star rating
- &lt;1% crash rate
- Monitor RevenueCat for conversion rate

---

## 📋 Checklist Summary

- [ ] GitHub Pages enabled (privacy.html, support.html public)
- [ ] Apple Developer account created ($99 enrollment)
- [ ] App created in App Store Connect
- [ ] RevenueCat account created
- [ ] Subscriptions created (monthly & yearly)
- [ ] RevenueCat linked to App Store products
- [ ] Environment variables set (EXPO_PUBLIC_REVENUECAT_IOS_API_KEY)
- [ ] EAS credentials configured
- [ ] Screenshots created (5, 1242×2688 px)
- [ ] App metadata complete
- [ ] Production build created
- [ ] TestFlight tested on device
- [ ] No crashes found
- [ ] Ready to submit!

---

**Estimated total time:** 2-4 hours over a few days

**Next step:** Complete GitHub Pages setup, then run TestFlight build!
