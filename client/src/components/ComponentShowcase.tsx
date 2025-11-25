import React, { useState } from 'react';
import { Trophy, Mail, Plus, Calendar, DollarSign, Users as UsersIcon, Flag } from 'lucide-react';
import { environment } from '../config/environment';
import { Navigate } from 'react-router-dom';

// Import all UI components
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Checkbox } from './ui/Checkbox';
import { SelectDropdown } from './ui/Dropdown';
import { EmptyState } from './ui/EmptyState';
import { ErrorPage } from './ui/ErrorState';
import { Input } from './ui/Input';
import { Spinner } from './ui/Loading';
import { SimpleLoading } from './ui/SimpleLoading';
import { Modal } from './ui/Modal';
import { DataTable } from './ui/Table';
import { Tabs } from './ui/Tabs';
import { Tooltip } from './ui/Tooltip';
import { PageContainer } from './ui/PageContainer';
import { FloatingActionButton, CircleButton } from './ui/FloatingActionButton';
import { SegmentedControl, ViewToggle } from './ui/SegmentedControl';
import { Testimonial, TestimonialSection } from './ui/Testimonial';
import { FeedItem } from './ui/FeedItem';

const ComponentShowcase: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [checked, setChecked] = useState(false);
  const [viewToggle, setViewToggle] = useState<'day' | 'week' | 'month'>('day');
  const [segmentedValue, setSegmentedValue] = useState('option1');

  // Only allow in development
  if (!environment.isDevelopment) {
    return <Navigate to="/" replace />;
  }

  return (
    <PageContainer>
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-block bg-purple-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium">
            🛠️ Development Only
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Component Showcase</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A comprehensive showcase of all available UI components in the Golf League App.
            This page is only accessible in development mode.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center overflow-x-auto px-4 sm:px-0">
          <div className="inline-flex bg-white rounded-lg shadow-sm border border-gray-200 p-1 min-w-min">
            {[
              { id: 'all', label: 'All Components' },
              { id: 'buttons', label: 'Buttons & Actions' },
              { id: 'data', label: 'Data Display' },
              { id: 'feedback', label: 'Feedback' },
              { id: 'forms', label: 'Forms' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Components Grid */}
        <div className="space-y-16">
          {/* Buttons Section */}
          {(selectedTab === 'all' || selectedTab === 'buttons') && (
            <ComponentSection title="Buttons" description="Various button styles and states">
              <div className="grid gap-6 md:grid-cols-2">
                <ShowcaseCard title="Primary Button">
                  <div className="space-y-3">
                    <Button variant="primary">Primary Button</Button>
                    <Button variant="primary" disabled>Disabled Button</Button>
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Secondary Button">
                  <div className="space-y-3">
                    <Button variant="secondary">Secondary Button</Button>
                    <Button variant="secondary" disabled>Disabled Button</Button>
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Danger Button">
                  <div className="space-y-3">
                    <Button variant="danger">Danger Button</Button>
                    <Button variant="danger" disabled>Disabled Button</Button>
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Neon Button (Accent)">
                  <div className="space-y-3">
                    <Button variant="neon">Neon CTA Button</Button>
                    <Button variant="outline-neon">Outline Neon</Button>
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Button Sizes">
                  <div className="flex items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                  </div>
                </ShowcaseCard>
              </div>
            </ComponentSection>
          )}

          {/* Badges Section */}
          {(selectedTab === 'all' || selectedTab === 'buttons') && (
            <ComponentSection title="Badges" description="Status indicators and labels">
              <div className="grid gap-6 md:grid-cols-2">
                <ShowcaseCard title="Badge Variants">
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="success">Success</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="error">Error</Badge>
                    <Badge variant="info">Info</Badge>
                    <Badge variant="default">Default</Badge>
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Neon Badge (Accent)">
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="neon">Memberships Available</Badge>
                    <Badge variant="neon" style="subtle">New Feature</Badge>
                    <Badge variant="neon" style="outlined">Limited Offer</Badge>
                  </div>
                </ShowcaseCard>
              </div>
            </ComponentSection>
          )}

          {/* Floating Action Buttons & Circle Buttons Section */}
          {(selectedTab === 'all' || selectedTab === 'buttons') && (
            <ComponentSection title="Floating Action & Circle Buttons" description="Primary action and selection buttons">
              <div className="grid gap-6 md:grid-cols-2">
                <ShowcaseCard title="Floating Action Button">
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Note: FAB uses fixed positioning. In real use, it appears at screen corners.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => alert('FAB clicked!')}
                        className="w-14 h-14 bg-brand-dark-green text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center"
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                      <div className="flex-1 text-sm text-gray-600">
                        <code className="block text-xs bg-gray-100 p-2 rounded">
                          &lt;FloatingActionButton<br/>
                          &nbsp;&nbsp;icon=&#123;Plus&#125;<br/>
                          &nbsp;&nbsp;onClick=&#123;handleClick&#125;<br/>
                          &nbsp;&nbsp;variant="primary"<br/>
                          /&gt;
                        </code>
                      </div>
                    </div>
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="FAB Variants & Sizes">
                  <div className="flex flex-wrap gap-3 items-center">
                    <button className="w-12 h-12 bg-brand-dark-green text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </button>
                    <button className="w-14 h-14 bg-gray-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center">
                      <Calendar className="w-6 h-6" />
                    </button>
                    <button className="w-16 h-16 bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center">
                      <Mail className="w-7 h-7" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Sizes: sm (48px), md (56px), lg (64px)
                  </p>
                </ShowcaseCard>

                <ShowcaseCard title="Circle Buttons (Bay Selectors)">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <CircleButton
                        key={num}
                        active={num === 1}
                        onClick={() => {}}
                        size="md"
                        variant="primary"
                      >
                        {num}
                      </CircleButton>
                    ))}
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Circle Button Variants">
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <CircleButton active variant="primary" size="sm">A</CircleButton>
                      <CircleButton variant="primary" size="sm">B</CircleButton>
                      <CircleButton variant="primary" size="sm">C</CircleButton>
                    </div>
                    <div className="flex gap-2">
                      <CircleButton active variant="secondary" size="md">1</CircleButton>
                      <CircleButton variant="secondary" size="md">2</CircleButton>
                      <CircleButton variant="secondary" size="md">3</CircleButton>
                    </div>
                    <div className="flex gap-2">
                      <CircleButton active variant="outline" size="lg">X</CircleButton>
                      <CircleButton variant="outline" size="lg">Y</CircleButton>
                      <CircleButton variant="outline" size="lg">Z</CircleButton>
                    </div>
                  </div>
                </ShowcaseCard>
              </div>
            </ComponentSection>
          )}

          {/* Segmented Controls Section */}
          {(selectedTab === 'all' || selectedTab === 'buttons') && (
            <ComponentSection title="Segmented Controls" description="Toggle controls for switching between options">
              <div className="grid gap-6 md:grid-cols-2">
                <ShowcaseCard title="View Toggle (Day/Week)">
                  <div className="space-y-4">
                    <ViewToggle
                      view={viewToggle}
                      onChange={setViewToggle}
                      views={['day', 'week', 'month']}
                    />
                    <p className="text-sm text-gray-600">
                      Current view: <strong>{viewToggle}</strong>
                    </p>
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Custom Segmented Control">
                  <div className="space-y-4">
                    <SegmentedControl
                      options={[
                        { value: 'option1', label: 'Option 1' },
                        { value: 'option2', label: 'Option 2' },
                        { value: 'option3', label: 'Option 3' },
                      ]}
                      value={segmentedValue}
                      onChange={setSegmentedValue}
                      variant="primary"
                    />
                    <p className="text-sm text-gray-600">
                      Selected: <strong>{segmentedValue}</strong>
                    </p>
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Segmented Control Sizes">
                  <div className="space-y-3">
                    <SegmentedControl
                      options={[
                        { value: 'a', label: 'Small' },
                        { value: 'b', label: 'Size' },
                      ]}
                      value="a"
                      onChange={() => {}}
                      size="sm"
                    />
                    <SegmentedControl
                      options={[
                        { value: 'a', label: 'Medium' },
                        { value: 'b', label: 'Size' },
                      ]}
                      value="a"
                      onChange={() => {}}
                      size="md"
                    />
                    <SegmentedControl
                      options={[
                        { value: 'a', label: 'Large' },
                        { value: 'b', label: 'Size' },
                      ]}
                      value="a"
                      onChange={() => {}}
                      size="lg"
                    />
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Segmented Control Variants">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Default</p>
                      <SegmentedControl
                        options={[
                          { value: 'a', label: 'Option A' },
                          { value: 'b', label: 'Option B' },
                        ]}
                        value="a"
                        onChange={() => {}}
                        variant="default"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Primary</p>
                      <SegmentedControl
                        options={[
                          { value: 'a', label: 'Option A' },
                          { value: 'b', label: 'Option B' },
                        ]}
                        value="a"
                        onChange={() => {}}
                        variant="primary"
                      />
                    </div>
                    <div className="bg-brand-dark-green p-3 rounded-lg">
                      <p className="text-xs text-white mb-2">Compact (on dark bg)</p>
                      <SegmentedControl
                        options={[
                          { value: 'a', label: 'Option A' },
                          { value: 'b', label: 'Option B' },
                        ]}
                        value="a"
                        onChange={() => {}}
                        variant="compact"
                      />
                    </div>
                  </div>
                </ShowcaseCard>
              </div>
            </ComponentSection>
          )}

          {/* Avatar Section */}
          {(selectedTab === 'all' || selectedTab === 'data') && (
            <ComponentSection title="Avatars" description="User profile images">
              <div className="grid gap-6 md:grid-cols-2">
                <ShowcaseCard title="Avatar Sizes">
                  <div className="flex items-center gap-4">
                    <Avatar size="sm" name="John Doe" />
                    <Avatar size="md" name="Jane Smith" />
                    <Avatar size="lg" name="Bob Wilson" />
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Avatar with Image">
                  <div className="flex items-center gap-4">
                    <Avatar
                      size="md"
                      name="Test User"
                      src="https://via.placeholder.com/150"
                    />
                    <Avatar size="md" name="No Image" />
                  </div>
                </ShowcaseCard>
              </div>
            </ComponentSection>
          )}

          {/* Cards Section */}
          {(selectedTab === 'all' || selectedTab === 'data') && (
            <ComponentSection title="Cards" description="Container components">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-2">Basic Card</h3>
                    <p className="text-gray-600">
                      This is a basic card component with padding and rounded corners.
                    </p>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      <h3 className="text-lg font-semibold">Card with Icon</h3>
                    </div>
                    <p className="text-gray-600">
                      Cards can contain icons, images, and various content types.
                    </p>
                  </div>
                </Card>
              </div>

              <div className="grid gap-6 mt-6">
                <ShowcaseCard title="Dark Green Card Variants (Website Style)">
                  <div className="bg-brand-dark-green rounded-xl p-6 space-y-4">
                    <Card variant="testimonial" padding="md">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-brand-neon-green bg-opacity-20 flex items-center justify-center flex-shrink-0">
                          <Trophy className="w-6 h-6 text-brand-neon-green" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-white">Testimonial Card</h4>
                          <p className="text-gray-300 text-sm">Club Pro</p>
                          <p className="text-white mt-2 text-sm">
                            "This semi-transparent card works great on dark backgrounds!"
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card variant="dark-elevated" padding="md">
                      <h4 className="font-bold mb-2">Dark Elevated Card</h4>
                      <p className="text-gray-200 text-sm">
                        Solid dark green background with shadow - perfect for highlighted content.
                      </p>
                    </Card>
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Testimonial Components (Website Style)">
                  <TestimonialSection
                    title="What Club Pros Are Saying"
                    subtitle="Real feedback from real pros"
                  >
                    <Testimonial
                      name="Erin Thorne"
                      role="Club Pro at No 6"
                      quote="Golf's hard. Excited to make it easier for everyone. Excited to help connect folks nearby. And excited to actually be able to swing more myself too!"
                    />
                    <Testimonial
                      name="Dan Miller"
                      role="Club Pro at No 2"
                      quote="I was gonna get a sim anyway and this just seemed fun. Took a few talks on the homefront with two kids at home, and now we're all enjoying it together!"
                    />
                  </TestimonialSection>
                </ShowcaseCard>
              </div>
            </ComponentSection>
          )}

          {/* Feed Item Section */}
          {(selectedTab === 'all' || selectedTab === 'layout') && (
            <ComponentSection
              title="Feed Items"
              description="Mobile-optimized feed/list items for challenges, events, and tournaments"
            >
              <div className="space-y-8 px-0.5">
                {/* Variant 1: Compact */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide px-1.5">
                    Variant 1: Compact List
                  </h3>
                  <div className="space-y-2 px-0.5">
                    <FeedItem
                      variant="compact"
                      title="Weekend Warriors Challenge"
                      subtitle="9-hole best ball"
                      status="open"
                      participants={{ current: 12, max: 16 }}
                      endDate="Ends Dec 31"
                      prize="$500"
                      icon={Trophy}
                      onAction={() => alert('Join clicked!')}
                      actionLabel="Join"
                      onClick={() => alert('Card clicked!')}
                    />
                    <FeedItem
                      variant="compact"
                      title="Monthly Scramble"
                      subtitle="Team of 4"
                      status="ending-soon"
                      participants={{ current: 28, max: 32 }}
                      endDate="2 days left"
                      prize="$1,000"
                      onAction={() => alert('Join clicked!')}
                      onClick={() => alert('Card clicked!')}
                    />
                    <FeedItem
                      variant="compact"
                      title="Club Championship"
                      subtitle="36-hole stroke play"
                      status="full"
                      participants={{ current: 64, max: 64 }}
                      endDate="Closed"
                      prize="Trophy"
                      onClick={() => alert('Card clicked!')}
                    />
                  </div>
                </div>

                {/* Variant 1b: Compact with Status Accent */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide px-1.5">
                    Variant 1b: Compact with Status Accent
                  </h3>
                  <div className="space-y-2 px-0.5">
                    <FeedItem
                      variant="compact-accent"
                      title="Free Entry Championship"
                      subtitle="18-hole medal play"
                      status="open"
                      icon={Trophy}
                      participants={{ current: 24, max: 50 }}
                      endDate="Jan 20"
                      onAction={() => alert('Join clicked!')}
                      actionLabel="Join"
                      onClick={() => alert('Card clicked!')}
                    />
                    <FeedItem
                      variant="compact-accent"
                      title="$100 Buy-in Tournament"
                      subtitle="36-hole championship"
                      status="ending-soon"
                      icon={DollarSign}
                      participants={{ current: 38, max: 48 }}
                      endDate="2 days left"
                      prize="$5,000"
                      onAction={() => alert('Enter clicked!')}
                      actionLabel="Enter"
                      onClick={() => alert('Card clicked!')}
                    />
                    <FeedItem
                      variant="compact-accent"
                      title="Members Only Event"
                      subtitle="Best ball pairs"
                      status="full"
                      icon={UsersIcon}
                      participants={{ current: 32, max: 32 }}
                      endDate="Closed"
                      prize="Trophy"
                      onClick={() => alert('Card clicked!')}
                    />
                    <FeedItem
                      variant="compact-accent"
                      title="Spring League Registration"
                      subtitle="12-week season"
                      status="closed"
                      icon={Flag}
                      participants={{ current: 64 }}
                      endDate="Registration ended"
                      onClick={() => alert('Card clicked!')}
                    />
                  </div>
                </div>

                {/* Variant 1c: Compact Minimal */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide px-1.5">
                    Variant 1c: Compact Minimal (Status via Color)
                  </h3>
                  <div className="space-y-2 px-0.5">
                    <FeedItem
                      variant="compact-minimal"
                      title="Weekend Championship"
                      subtitle="18-hole medal play"
                      status="open"
                      participants={{ current: 24, max: 50 }}
                      endDate="Jan 20"
                      onAction={() => alert('Join clicked!')}
                      actionLabel="Join"
                      onClick={() => alert('Card clicked!')}
                    />
                    <FeedItem
                      variant="compact-minimal"
                      title="Premium Tournament"
                      subtitle="36-hole championship"
                      status="ending-soon"
                      participants={{ current: 38, max: 48 }}
                      endDate="2 days left"
                      prize="$5,000"
                      onAction={() => alert('Enter clicked!')}
                      actionLabel="Enter"
                      onClick={() => alert('Card clicked!')}
                    />
                    <FeedItem
                      variant="compact-minimal"
                      title="Members Only Event"
                      subtitle="Best ball pairs"
                      status="full"
                      participants={{ current: 32, max: 32 }}
                      endDate="Closed"
                      onAction={() => alert('Cannot join - full!')}
                      actionLabel="Full"
                      onClick={() => alert('Card clicked!')}
                    />
                    <FeedItem
                      variant="compact-minimal"
                      title="Spring League Registration"
                      subtitle="12-week season"
                      status="closed"
                      participants={{ current: 64 }}
                      endDate="Registration ended"
                      onAction={() => alert('Cannot join - closed!')}
                      actionLabel="Closed"
                      onClick={() => alert('Card clicked!')}
                    />
                  </div>
                </div>

                {/* Variant 2: Featured */}
                <ShowcaseCard title="Variant 2: Featured Card">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FeedItem
                      variant="featured"
                      title="Spring Open Tournament"
                      subtitle="18-hole championship"
                      description="Join our premier tournament featuring cash prizes and professional scoring. Open to all skill levels."
                      status="open"
                      participants={{ current: 45, max: 128 }}
                      prize="$5,000"
                      onAction={() => alert('Register clicked!')}
                      actionLabel="Register"
                      onClick={() => alert('Card clicked!')}
                    />
                    <FeedItem
                      variant="featured"
                      title="League Night"
                      subtitle="Weekly 9-hole league"
                      description="Play every Thursday evening in our friendly league. Season runs for 12 weeks."
                      status="open"
                      participants={{ current: 32 }}
                      prize="Prizes"
                      onAction={() => alert('Join League!')}
                      actionLabel="Join"
                      onClick={() => alert('Card clicked!')}
                    />
                  </div>
                </ShowcaseCard>
              </div>
            </ComponentSection>
          )}

          {/* Table Section */}
          {(selectedTab === 'all' || selectedTab === 'data') && (
            <ComponentSection title="Tables" description="Data tables">
              <ShowcaseCard title="Basic Table">
                <DataTable
                  columns={[
                    { id: 'name', label: 'Player', accessor: 'name', sortable: true },
                    { id: 'score', label: 'Score', accessor: 'score', sortable: true },
                    { id: 'rank', label: 'Rank', accessor: 'rank', sortable: true }
                  ]}
                  data={[
                    { name: 'John Doe', score: 72, rank: 1 },
                    { name: 'Jane Smith', score: 74, rank: 2 },
                    { name: 'Bob Wilson', score: 76, rank: 3 }
                  ]}
                  keyExtractor={(row) => row.rank}
                />
              </ShowcaseCard>
            </ComponentSection>
          )}

          {/* Loading States Section */}
          {(selectedTab === 'all' || selectedTab === 'feedback') && (
            <ComponentSection title="Loading States" description="Loading indicators">
              <div className="grid gap-6 md:grid-cols-2">
                <ShowcaseCard title="Spinner">
                  <div className="h-32 flex items-center justify-center">
                    <Spinner size="lg" />
                  </div>
                </ShowcaseCard>

                <ShowcaseCard title="Simple Loading">
                  <div className="h-32 flex items-center justify-center">
                    <SimpleLoading text="Loading data..." />
                  </div>
                </ShowcaseCard>
              </div>
            </ComponentSection>
          )}

          {/* Empty & Error States Section */}
          {(selectedTab === 'all' || selectedTab === 'feedback') && (
            <ComponentSection title="Empty & Error States" description="Feedback states">
              <div className="grid gap-6">
                <ShowcaseCard title="Empty State">
                  <EmptyState
                    icon={Trophy}
                    title="No Tournaments Found"
                    description="There are no active tournaments at the moment."
                  >
                    <Button variant="primary" className="mt-4">
                      Create Tournament
                    </Button>
                  </EmptyState>
                </ShowcaseCard>

                <ShowcaseCard title="Error State">
                  <ErrorPage
                    title="Failed to Load Data"
                    message="We couldn't fetch the tournament data. Please try again."
                  />
                </ShowcaseCard>
              </div>
            </ComponentSection>
          )}

          {/* Modal Section */}
          {(selectedTab === 'all' || selectedTab === 'feedback') && (
            <ComponentSection title="Modals" description="Dialog windows">
              <ShowcaseCard title="Modal Example">
                <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
                <Modal
                  open={modalOpen}
                  onClose={() => setModalOpen(false)}
                >
                  <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">Example Modal</h2>
                    <p className="text-gray-600">
                      This is an example modal dialog. It can contain forms, information,
                      or any other content you need to display.
                    </p>
                    <div className="flex justify-end gap-3 mt-6">
                      <Button variant="secondary" onClick={() => setModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="primary" onClick={() => setModalOpen(false)}>
                        Confirm
                      </Button>
                    </div>
                  </div>
                </Modal>
              </ShowcaseCard>
            </ComponentSection>
          )}

          {/* Forms Section */}
          {(selectedTab === 'all' || selectedTab === 'forms') && (
            <ComponentSection title="Form Inputs" description="Form elements">
              <div className="grid gap-6 md:grid-cols-2">
                <ShowcaseCard title="Text Input">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="john@example.com"
                  />
                </ShowcaseCard>

                <ShowcaseCard title="Input with Error">
                  <Input
                    label="Username"
                    type="text"
                    placeholder="username"
                    error="This username is already taken"
                  />
                </ShowcaseCard>

                <ShowcaseCard title="Checkbox">
                  <Checkbox
                    label="I agree to the terms and conditions"
                    checked={checked}
                    onChange={(e) => setChecked(e.target.checked)}
                  />
                </ShowcaseCard>

                <ShowcaseCard title="Dropdown">
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Tournament
                    </label>
                    <SelectDropdown
                      options={[
                        { value: '1', label: 'Weekly Challenge' },
                        { value: '2', label: 'Monthly Cup' },
                        { value: '3', label: 'Annual Championship' }
                      ]}
                      value="1"
                      onChange={(value) => console.log('Selected:', value)}
                    />
                  </div>
                </ShowcaseCard>
              </div>
            </ComponentSection>
          )}

          {/* Tabs Section */}
          {(selectedTab === 'all' || selectedTab === 'buttons') && (
            <ComponentSection title="Tabs" description="Navigation tabs">
              <ShowcaseCard title="Tab Navigation">
                <div className="overflow-x-auto">
                  <Tabs
                    tabs={[
                      { id: 'overview', label: 'Overview' },
                      { id: 'profile', label: 'Profile' },
                      { id: 'settings', label: 'Settings' }
                    ]}
                    value="overview"
                    onChange={(id) => console.log('Tab changed to:', id)}
                  />
                </div>
              </ShowcaseCard>
            </ComponentSection>
          )}

          {/* Tooltips Section */}
          {(selectedTab === 'all' || selectedTab === 'feedback') && (
            <ComponentSection title="Tooltips" description="Hover information">
              <ShowcaseCard title="Tooltip Example">
                <div className="flex gap-4">
                  <Tooltip content="This is a helpful tooltip">
                    <Button variant="secondary">Hover me</Button>
                  </Tooltip>
                  <Tooltip content="Tooltips can provide additional context">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-help">
                      <Mail className="w-4 h-4" />
                      Info Icon
                    </span>
                  </Tooltip>
                </div>
              </ShowcaseCard>
            </ComponentSection>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-gray-600">
            All components are built with React + TypeScript and styled with Tailwind CSS
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Environment: {environment.isDevelopment ? 'Development' : 'Production'}
          </p>
        </div>
      </div>
    </PageContainer>
  );
};

// Helper Components
const ComponentSection: React.FC<{
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">{description}</p>
      </div>
      {children}
    </section>
  );
};

const ShowcaseCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
          {title}
        </h3>
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </Card>
  );
};

export default ComponentShowcase;
