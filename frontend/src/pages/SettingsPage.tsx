import { useState } from 'react';
import { Settings, Save, Building2, Bell, Shield, Palette, Database, User, Lock, Globe, Zap, Moon, Sun, Monitor, Check, AlertTriangle } from 'lucide-react';
import PageHeader, { QuickStats } from '../components/UI/PageHeader';
import ModernCard, { CardHeader, CardContent, CardActions, ModernButton } from '../components/UI/ModernCard';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [savedSettings, setSavedSettings] = useState<string[]>([]);
  const [selectedThemeColor, setSelectedThemeColor] = useState('purple');
  const [displayDensity, setDisplayDensity] = useState('comfortable');
  const { theme, toggleTheme } = useTheme();

  const tabs = [
    { id: 'general', name: 'General', icon: Settings, color: 'blue', description: 'Application preferences' },
    { id: 'company', name: 'Company Info', icon: Building2, color: 'green', description: 'Business information' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'orange', description: 'Alert preferences' },
    { id: 'security', name: 'Security', icon: Shield, color: 'red', description: 'Access & privacy' },
    { id: 'appearance', name: 'Appearance', icon: Palette, color: 'purple', description: 'Theme & display' },
    { id: 'backup', name: 'Backup', icon: Database, color: 'indigo', description: 'Data management' },
  ];

  const handleSaveSettings = (section: string) => {
    setSavedSettings(prev => [...prev.filter(s => s !== section), section]);
    setTimeout(() => {
      setSavedSettings(prev => prev.filter(s => s !== section));
    }, 3000);
  };

  const quickStatsData = [
    { label: 'Settings Groups', value: '6', icon: Settings, color: 'blue' as const },
    { label: 'Active Features', value: '12', icon: Zap, color: 'green' as const },
    { label: 'Security Level', value: 'High', icon: Shield, color: 'red' as const },
    { label: 'Last Updated', value: 'Today', icon: Save, color: 'purple' as const },
  ];

  const themeColors = [
    { name: 'Purple', color: 'bg-purple-500', value: 'purple' },
    { name: 'Blue', color: 'bg-blue-500', value: 'blue' },
    { name: 'Green', color: 'bg-green-500', value: 'green' },
    { name: 'Red', color: 'bg-red-500', value: 'red' },
    { name: 'Orange', color: 'bg-orange-500', value: 'orange' },
    { name: 'Pink', color: 'bg-pink-500', value: 'pink' },
  ];

  const getTabIconBgClass = (color: string, isActive: boolean) => {
    if (!isActive) return 'bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600';

    switch (color) {
      case 'blue': return 'bg-blue-100 dark:bg-blue-900/30';
      case 'green': return 'bg-green-100 dark:bg-green-900/30';
      case 'orange': return 'bg-orange-100 dark:bg-orange-900/30';
      case 'red': return 'bg-red-100 dark:bg-red-900/30';
      case 'purple': return 'bg-purple-100 dark:bg-purple-900/30';
      case 'indigo': return 'bg-indigo-100 dark:bg-indigo-900/30';
      default: return 'bg-blue-100 dark:bg-blue-900/30';
    }
  };

  const getTabIconTextClass = (color: string, isActive: boolean) => {
    if (!isActive) return 'text-gray-500 dark:text-gray-400';

    switch (color) {
      case 'blue': return 'text-blue-600 dark:text-blue-400';
      case 'green': return 'text-green-600 dark:text-green-400';
      case 'orange': return 'text-orange-600 dark:text-orange-400';
      case 'red': return 'text-red-600 dark:text-red-400';
      case 'purple': return 'text-purple-600 dark:text-purple-400';
      case 'indigo': return 'text-indigo-600 dark:text-indigo-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your application preferences and configuration"
        stats={<QuickStats stats={quickStatsData} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <ModernCard className="h-fit">
          <CardContent>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 font-medium shadow-sm border border-blue-200/50 dark:border-blue-700/50'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className={`flex-shrink-0 p-2 rounded-lg transition-colors ${getTabIconBgClass(tab.color, isActive)}`}>
                      <Icon className={`w-4 h-4 ${getTabIconTextClass(tab.color, isActive)}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{tab.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </ModernCard>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <ModernCard>
            {activeTab === 'general' && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">General Settings</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Configure basic application preferences</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Application Name
                      </label>
                      <input
                        type="text"
                        defaultValue="Car Service Center"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Default Currency
                      </label>
                      <select className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white">
                        <option value="INR">₹ Indian Rupee (INR)</option>
                        <option value="USD">$ US Dollar (USD)</option>
                        <option value="EUR">€ Euro (EUR)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Default Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        defaultValue="18"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Invoice Prefix
                      </label>
                      <input
                        type="text"
                        defaultValue="INV"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Trial Version Banner */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">Trial Version Active</h3>
                        <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                          You are using the trial version with full functionality enabled.
                          Contact support for licensing information.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardActions>
                  <ModernButton
                    variant="primary"
                    onClick={() => handleSaveSettings('general')}
                    className="flex items-center gap-2"
                  >
                    {savedSettings.includes('general') ? (
                      <>
                        <Check className="w-4 h-4" />
                        Settings Saved!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </ModernButton>
                </CardActions>
              </>
            )}

            {activeTab === 'company' && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Company Information</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage your business details and contact information</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Company Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Om Murugan Car Service Center"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Address
                    </label>
                    <textarea
                      rows={3}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white resize-none"
                      placeholder="Enter complete address"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <input
                        type="email"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white"
                        placeholder="info@carservice.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        GST Number
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white"
                        placeholder="Enter GST number"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-all text-gray-900 dark:text-white"
                        placeholder="Enter PAN number"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardActions>
                  <ModernButton
                    variant="primary"
                    onClick={() => handleSaveSettings('company')}
                    className="flex items-center gap-2"
                  >
                    {savedSettings.includes('company') ? (
                      <>
                        <Check className="w-4 h-4" />
                        Company Info Saved!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Company Info
                      </>
                    )}
                  </ModernButton>
                </CardActions>
              </>
            )}

            {activeTab === 'appearance' && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Customize the look and feel of your application</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Theme Mode */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Monitor className="w-5 h-5" />
                      Theme Mode
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            {theme === 'dark' ? (
                              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {theme === 'dark' ? 'Easy on the eyes' : 'Classic bright theme'}
                            </p>
                          </div>
                        </div>
                        <ModernButton
                          variant="secondary"
                          onClick={toggleTheme}
                          className="flex items-center gap-2"
                        >
                          {theme === 'dark' ? (
                            <>
                              <Sun className="w-4 h-4" />
                              Light
                            </>
                          ) : (
                            <>
                              <Moon className="w-4 h-4" />
                              Dark
                            </>
                          )}
                        </ModernButton>
                      </div>
                    </div>
                  </div>

                  {/* Theme Color */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Palette className="w-5 h-5" />
                      Theme Color
                    </h3>
                    <div className="grid grid-cols-6 gap-4">
                      {themeColors.map((themeColor) => (
                        <button
                          key={themeColor.name}
                          onClick={() => setSelectedThemeColor(themeColor.value)}
                          className={`group relative w-16 h-16 rounded-xl ${themeColor.color} shadow-lg transition-all duration-200 hover:scale-105 ${
                            selectedThemeColor === themeColor.value
                              ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600 scale-105'
                              : ''
                          }`}
                          title={themeColor.name}
                        >
                          {selectedThemeColor === themeColor.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check className="w-6 h-6 text-white drop-shadow-lg" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Display Density */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      Display Density
                    </h3>
                    <div className="space-y-3">
                      {[
                        { id: 'comfortable', label: 'Comfortable', description: 'More spacing and larger elements (Recommended)', value: 'comfortable' },
                        { id: 'compact', label: 'Compact', description: 'Tighter spacing for more content', value: 'compact' }
                      ].map((density) => (
                        <label key={density.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <input
                            type="radio"
                            name="density"
                            value={density.value}
                            checked={displayDensity === density.value}
                            onChange={(e) => setDisplayDensity(e.target.value)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{density.label}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">{density.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardActions>
                  <ModernButton
                    variant="primary"
                    onClick={() => handleSaveSettings('appearance')}
                    className="flex items-center gap-2"
                  >
                    {savedSettings.includes('appearance') ? (
                      <>
                        <Check className="w-4 h-4" />
                        Appearance Saved!
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Appearance
                      </>
                    )}
                  </ModernButton>
                </CardActions>
              </>
            )}

            {/* Other Tab Contents */}
            {activeTab === 'notifications' && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Bell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Configure alert and notification preferences</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-orange-500 dark:text-orange-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Coming Soon
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Notification settings will be available in the full version.
                    </p>
                  </div>
                </CardContent>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Security</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage access control and privacy settings</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-red-500 dark:text-red-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Coming Soon
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Security settings will be available in the full version.
                    </p>
                  </div>
                </CardContent>
              </>
            )}

            {activeTab === 'backup' && (
              <>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Backup & Data</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage data backup and export options</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Database className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Coming Soon
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Backup and data management features will be available in the full version.
                    </p>
                  </div>
                </CardContent>
              </>
            )}
          </ModernCard>
        </div>
      </div>
    </div>
  );
}