import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "react-dom/server";
import { Button } from "../admin/components/button.tsx";
import { Card } from "../admin/components/card.tsx";
import { DataTable } from "../admin/components/data-table.tsx";
import { FormField } from "../admin/components/form-field.tsx";
import { Alert } from "../admin/components/alert.tsx";
import { Pagination } from "../admin/components/pagination.tsx";
import { EmptyState } from "../admin/components/empty-state.tsx";
import { Breadcrumb } from "../admin/components/breadcrumb.tsx";
import { SidebarNav } from "../admin/components/sidebar-nav.tsx";
import { LoginForm } from "../admin/components/login-form.tsx";
import { CrudList } from "../admin/components/crud-list.tsx";
import { CrudForm } from "../admin/components/crud-form.tsx";
import type { DataTableColumn } from "../admin/components/data-table.tsx";

// --- Button ---
describe("Button component", () => {
  it("should render a <button> element by default", () => {
    const html = renderToString(<Button>Click me</Button>);
    assertStringIncludes(html, "<button");
    assertStringIncludes(html, "Click me");
  });

  it("should render an <a> element when href is provided", () => {
    const html = renderToString(
      <Button href="/go-somewhere">Go</Button>,
    );
    assertStringIncludes(html, "<a");
    assertStringIncludes(html, 'href="/go-somewhere"');
    assertStringIncludes(html, "Go");
  });

  it("should apply primary variant classes by default", () => {
    const html = renderToString(<Button>Primary</Button>);
    assertStringIncludes(html, "bg-indigo-600");
  });

  it("should apply secondary variant classes", () => {
    const html = renderToString(
      <Button variant="secondary">Secondary</Button>,
    );
    assertStringIncludes(html, "bg-white");
    assertStringIncludes(html, "text-gray-900");
  });

  it("should apply danger variant classes", () => {
    const html = renderToString(<Button variant="danger">Delete</Button>);
    assertStringIncludes(html, "bg-red-600");
  });

  it("should apply sm size classes", () => {
    const html = renderToString(<Button size="sm">Small</Button>);
    assertStringIncludes(html, "px-2.5");
  });

  it("should apply lg size classes", () => {
    const html = renderToString(<Button size="lg">Large</Button>);
    assertStringIncludes(html, "px-4");
  });

  it("should render disabled state with opacity", () => {
    const html = renderToString(<Button disabled>Disabled</Button>);
    assertStringIncludes(html, "opacity-50");
    assertStringIncludes(html, "cursor-not-allowed");
  });

  it("should render submit type button", () => {
    const html = renderToString(<Button type="submit">Submit</Button>);
    assertStringIncludes(html, 'type="submit"');
  });
});

// --- Card ---
describe("Card component", () => {
  it("should render title", () => {
    const html = renderToString(
      <Card
        title="My Plugin"
        description="Desc"
        href="/admin/plugins/my"
        icon={<span>icon</span>}
        colorClass="bg-blue-50"
      />,
    );
    assertStringIncludes(html, "My Plugin");
  });

  it("should render description", () => {
    const html = renderToString(
      <Card
        title="Title"
        description="Card description"
        href="/admin/plugins/test"
        icon={<span>i</span>}
        colorClass="bg-green-50"
      />,
    );
    assertStringIncludes(html, "Card description");
  });

  it("should render href link", () => {
    const html = renderToString(
      <Card
        title="Title"
        description="Desc"
        href="/admin/plugins/target"
        icon={<span>i</span>}
        colorClass="bg-red-50"
      />,
    );
    assertStringIncludes(html, 'href="/admin/plugins/target"');
  });

  it("should render icon element", () => {
    const html = renderToString(
      <Card
        title="Title"
        description="Desc"
        href="/admin"
        icon={<span className="my-icon">ICON</span>}
        colorClass="bg-yellow-50"
      />,
    );
    assertStringIncludes(html, "ICON");
  });

  it("should apply colorClass to icon wrapper", () => {
    const html = renderToString(
      <Card
        title="Title"
        description="Desc"
        href="/admin"
        icon={<span>i</span>}
        colorClass="bg-purple-100"
      />,
    );
    assertStringIncludes(html, "bg-purple-100");
  });
});

// --- DataTable ---
describe("DataTable component", () => {
  const columns: DataTableColumn[] = [
    { key: "name", label: "Name" },
    { key: "status", label: "Status" },
  ];

  it("should render table headers for columns", () => {
    const html = renderToString(
      <DataTable
        title="Items"
        description="All items"
        columns={columns}
        rows={[{ id: "1", name: "Alpha", status: "active" }]}
      />,
    );
    assertStringIncludes(html, "Name");
    assertStringIncludes(html, "Status");
  });

  it("should render row data", () => {
    const html = renderToString(
      <DataTable
        title="Items"
        description="All items"
        columns={columns}
        rows={[{ id: "1", name: "Alpha", status: "active" }]}
      />,
    );
    assertStringIncludes(html, "Alpha");
    assertStringIncludes(html, "active");
  });

  it("should render EmptyState when rows is empty", () => {
    const html = renderToString(
      <DataTable
        title="Items"
        description="All items"
        columns={columns}
        rows={[]}
        emptyTitle="Nothing here"
      />,
    );
    assertStringIncludes(html, "Nothing here");
  });

  it("should render title", () => {
    const html = renderToString(
      <DataTable
        title="My Table"
        description="description"
        columns={[]}
        rows={[]}
      />,
    );
    assertStringIncludes(html, "My Table");
  });

  it("should render createHref link when provided", () => {
    const html = renderToString(
      <DataTable
        title="Items"
        description="items"
        columns={columns}
        rows={[]}
        createHref="/admin/plugins/test/new"
        createLabel="Add item"
      />,
    );
    assertStringIncludes(html, 'href="/admin/plugins/test/new"');
    assertStringIncludes(html, "Add item");
  });

  it("should render actions column header when actions provided", () => {
    const html = renderToString(
      <DataTable
        title="Items"
        description="items"
        columns={columns}
        rows={[{ id: "1", name: "X", status: "ok" }]}
        actions={[{ label: "Edit", href: (row) => `/edit/${row.id}` }]}
      />,
    );
    assertStringIncludes(html, "Actions");
  });

  it("should render danger action as a form with POST method", () => {
    const html = renderToString(
      <DataTable
        title="Items"
        description="items"
        columns={columns}
        rows={[{ id: "1", name: "X", status: "ok" }]}
        actions={[
          {
            label: "Delete",
            href: (row) => `/delete/${row.id}`,
            variant: "danger",
          },
        ]}
      />,
    );
    assertStringIncludes(html, 'method="POST"');
    assertStringIncludes(html, "Delete");
  });

  it("should render aria-label on table", () => {
    const html = renderToString(
      <DataTable
        title="Posts List"
        description="All posts"
        columns={columns}
        rows={[{ id: "1", name: "Post", status: "active" }]}
      />,
    );
    assertStringIncludes(html, "Posts List list");
  });
});

// --- FormField ---
describe("FormField component", () => {
  it("should render label with for attribute", () => {
    const html = renderToString(
      <FormField name="username" label="Username" />,
    );
    assertStringIncludes(html, "Username");
    assertStringIncludes(html, 'for="username"');
  });

  it("should render text input by default", () => {
    const html = renderToString(
      <FormField name="email" label="Email" />,
    );
    assertStringIncludes(html, 'type="text"');
    assertStringIncludes(html, 'name="email"');
  });

  it("should render textarea when type is textarea", () => {
    const html = renderToString(
      <FormField name="bio" label="Bio" type="textarea" />,
    );
    assertStringIncludes(html, "<textarea");
    assertStringIncludes(html, 'name="bio"');
  });

  it("should render select with options when type is select", () => {
    const html = renderToString(
      <FormField
        name="role"
        label="Role"
        type="select"
        options={[
          { value: "admin", label: "Admin" },
          { value: "editor", label: "Editor" },
        ]}
      />,
    );
    assertStringIncludes(html, "<select");
    assertStringIncludes(html, "Admin");
    assertStringIncludes(html, "Editor");
  });

  it("should render checkbox input when type is checkbox", () => {
    const html = renderToString(
      <FormField name="active" label="Active" type="checkbox" />,
    );
    assertStringIncludes(html, 'type="checkbox"');
  });

  it("should render password input when type is password", () => {
    const html = renderToString(
      <FormField name="pass" label="Password" type="password" />,
    );
    assertStringIncludes(html, 'type="password"');
  });

  it("should render error message with role alert when error is set", () => {
    const html = renderToString(
      <FormField name="email" label="Email" error="Invalid email" />,
    );
    assertStringIncludes(html, "Invalid email");
    assertStringIncludes(html, 'role="alert"');
  });

  it("should render hint text when hint is provided (no error)", () => {
    const html = renderToString(
      <FormField name="slug" label="Slug" hint="URL-friendly identifier" />,
    );
    assertStringIncludes(html, "URL-friendly identifier");
  });

  it("should render required asterisk when required is true", () => {
    const html = renderToString(
      <FormField name="name" label="Name" required />,
    );
    assertStringIncludes(html, "required");
  });

  it("should add aria-describedby pointing to error id when error is set", () => {
    const html = renderToString(
      <FormField name="title" label="Title" error="Required" />,
    );
    assertStringIncludes(html, 'aria-describedby="title-error"');
    assertStringIncludes(html, 'id="title-error"');
  });

  it("should render textarea with custom rows", () => {
    const html = renderToString(
      <FormField name="body" label="Body" type="textarea" rows={10} />,
    );
    assertStringIncludes(html, "<textarea");
    assertStringIncludes(html, 'rows="10"');
  });

  it("should render textarea with default rows=4", () => {
    const html = renderToString(
      <FormField name="body" label="Body" type="textarea" />,
    );
    assertStringIncludes(html, 'rows="4"');
  });

  it("should render multi-select with multiple attribute", () => {
    const html = renderToString(
      <FormField
        name="categories"
        label="Categories"
        type="select"
        multiple
        options={[
          { value: "cat-1", label: "Tech" },
          { value: "cat-2", label: "News" },
        ]}
      />,
    );
    assertStringIncludes(html, "<select");
    assertStringIncludes(html, "multiple");
    assertStringIncludes(html, 'name="categories[]"');
    assertStringIncludes(html, 'size="5"');
  });

  it("should render single select with Select... placeholder", () => {
    const html = renderToString(
      <FormField
        name="status"
        label="Status"
        type="select"
        options={[
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
        ]}
      />,
    );
    assertStringIncludes(html, "Select...");
  });

  it("should not render Select... placeholder for multi-select", () => {
    const html = renderToString(
      <FormField
        name="tags"
        label="Tags"
        type="select"
        multiple
        options={[{ value: "a", label: "A" }]}
      />,
    );
    assertEquals(html.includes("Select..."), false);
  });

  it("should apply readOnly attribute on text input", () => {
    const html = renderToString(
      <FormField name="id" label="ID" readonly />,
    );
    assertStringIncludes(html, "readOnly");
    assertStringIncludes(html, "bg-gray-50");
  });

  it("should apply readOnly attribute on textarea", () => {
    const html = renderToString(
      <FormField name="body" label="Body" type="textarea" readonly />,
    );
    assertStringIncludes(html, "<textarea");
    assertStringIncludes(html, "readOnly");
    assertStringIncludes(html, "bg-gray-50");
  });
});

// --- Alert ---
describe("Alert component", () => {
  it("should render role=alert", () => {
    const html = renderToString(
      <Alert type="success" title="Done" />,
    );
    assertStringIncludes(html, 'role="alert"');
  });

  it("should render success type with green classes", () => {
    const html = renderToString(
      <Alert type="success" title="Saved" />,
    );
    assertStringIncludes(html, "bg-green-50");
    assertStringIncludes(html, "text-green-800");
  });

  it("should render error type with red classes", () => {
    const html = renderToString(
      <Alert type="error" title="Error occurred" />,
    );
    assertStringIncludes(html, "bg-red-50");
    assertStringIncludes(html, "text-red-800");
  });

  it("should render warning type with yellow classes", () => {
    const html = renderToString(
      <Alert type="warning" title="Warning" />,
    );
    assertStringIncludes(html, "bg-yellow-50");
    assertStringIncludes(html, "text-yellow-800");
  });

  it("should render info type with blue classes", () => {
    const html = renderToString(
      <Alert type="info" title="Info" />,
    );
    assertStringIncludes(html, "bg-blue-50");
    assertStringIncludes(html, "text-blue-800");
  });

  it("should render title text", () => {
    const html = renderToString(
      <Alert type="success" title="Operation successful" />,
    );
    assertStringIncludes(html, "Operation successful");
  });

  it("should render message when provided", () => {
    const html = renderToString(
      <Alert type="info" title="Note" message="This is a detail message" />,
    );
    assertStringIncludes(html, "This is a detail message");
  });

  it("should render dismiss button when dismissible is true", () => {
    const html = renderToString(
      <Alert type="success" title="Done" dismissible />,
    );
    assertStringIncludes(html, "Dismiss");
    assertStringIncludes(html, "data-dismiss-alert");
  });

  it("should not render dismiss button when dismissible is false", () => {
    const html = renderToString(
      <Alert type="error" title="Error" dismissible={false} />,
    );
    assertEquals(html.includes("data-dismiss-alert"), false);
  });
});

// --- Pagination ---
describe("Pagination component", () => {
  it("should return null when totalPages <= 1", () => {
    const html = renderToString(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={5}
        pageSize={20}
        baseHref="/admin/plugins/posts"
      />,
    );
    assertEquals(html, "");
  });

  it("should return null when totalPages is 0", () => {
    const html = renderToString(
      <Pagination
        currentPage={1}
        totalPages={0}
        totalItems={0}
        pageSize={20}
        baseHref="/admin/plugins/posts"
      />,
    );
    assertEquals(html, "");
  });

  it("should render nav with aria-label Pagination", () => {
    const html = renderToString(
      <Pagination
        currentPage={1}
        totalPages={3}
        totalItems={60}
        pageSize={20}
        baseHref="/admin/posts"
      />,
    );
    assertStringIncludes(html, "Pagination");
  });

  it("should render page numbers", () => {
    const html = renderToString(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={100}
        pageSize={20}
        baseHref="/admin/posts"
      />,
    );
    assertStringIncludes(html, ">1<");
    assertStringIncludes(html, ">5<");
  });

  it("should highlight current page with aria-current=page", () => {
    const html = renderToString(
      <Pagination
        currentPage={2}
        totalPages={4}
        totalItems={80}
        pageSize={20}
        baseHref="/admin/posts"
      />,
    );
    assertStringIncludes(html, 'aria-current="page"');
  });

  it("should render prev and next aria labels", () => {
    const html = renderToString(
      <Pagination
        currentPage={2}
        totalPages={4}
        totalItems={80}
        pageSize={20}
        baseHref="/admin/posts"
      />,
    );
    assertStringIncludes(html, "Previous page");
    assertStringIncludes(html, "Next page");
  });

  it("should show count summary text", () => {
    const html = renderToString(
      <Pagination
        currentPage={1}
        totalPages={2}
        totalItems={30}
        pageSize={20}
        baseHref="/admin/posts"
      />,
    );
    assertStringIncludes(html, "30");
  });
});

// --- EmptyState ---
describe("EmptyState component", () => {
  it("should render title", () => {
    const html = renderToString(
      <EmptyState title="No items" description="Create one to get started" />,
    );
    assertStringIncludes(html, "No items");
  });

  it("should render description", () => {
    const html = renderToString(
      <EmptyState title="Empty" description="Nothing to see here" />,
    );
    assertStringIncludes(html, "Nothing to see here");
  });

  it("should render CTA link when actionLabel and actionHref provided", () => {
    const html = renderToString(
      <EmptyState
        title="Empty"
        description="Desc"
        actionLabel="Create New"
        actionHref="/admin/new"
      />,
    );
    assertStringIncludes(html, "Create New");
    assertStringIncludes(html, 'href="/admin/new"');
  });

  it("should not render CTA when actionLabel is missing", () => {
    const html = renderToString(
      <EmptyState title="Empty" description="Desc" actionHref="/admin/new" />,
    );
    assertEquals(html.includes("/admin/new"), false);
  });

  it("should render default SVG icon when no icon provided", () => {
    const html = renderToString(
      <EmptyState title="Empty" description="Desc" />,
    );
    assertStringIncludes(html, "<svg");
    assertStringIncludes(html, 'aria-hidden="true"');
  });

  it("should render custom icon when provided", () => {
    const html = renderToString(
      <EmptyState
        title="Empty"
        description="Desc"
        icon={<span className="custom-icon">icon</span>}
      />,
    );
    assertStringIncludes(html, "custom-icon");
    assertStringIncludes(html, "icon");
  });
});

// --- Breadcrumb ---
describe("Breadcrumb component", () => {
  it("should render nav with aria-label Breadcrumb", () => {
    const html = renderToString(
      <Breadcrumb items={[{ label: "Posts" }]} />,
    );
    assertStringIncludes(html, 'aria-label="Breadcrumb"');
  });

  it("should render home icon link to /admin", () => {
    const html = renderToString(
      <Breadcrumb items={[{ label: "Posts" }]} />,
    );
    assertStringIncludes(html, 'href="/admin"');
    assertStringIncludes(html, "Home");
  });

  it("should render item labels", () => {
    const html = renderToString(
      <Breadcrumb
        items={[{ label: "Posts", href: "/admin/plugins/posts" }, {
          label: "New",
        }]}
      />,
    );
    assertStringIncludes(html, "Posts");
    assertStringIncludes(html, "New");
  });

  it("should render item with href as an anchor", () => {
    const html = renderToString(
      <Breadcrumb
        items={[{ label: "Posts", href: "/admin/plugins/posts" }]}
      />,
    );
    assertStringIncludes(html, 'href="/admin/plugins/posts"');
  });

  it("should render last item (no href) with aria-current=page", () => {
    const html = renderToString(
      <Breadcrumb items={[{ label: "Detail" }]} />,
    );
    assertStringIncludes(html, 'aria-current="page"');
  });
});

// --- SidebarNav ---
describe("SidebarNav component", () => {
  const items = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: <span>D</span>,
      active: true,
    },
    {
      label: "Posts",
      href: "/admin/plugins/post-plugin",
      icon: <span>P</span>,
      active: false,
    },
  ];

  it("should render nav with aria-label Admin navigation", () => {
    const html = renderToString(<SidebarNav items={items} />);
    assertStringIncludes(html, 'aria-label="Admin navigation"');
  });

  it("should render item labels", () => {
    const html = renderToString(<SidebarNav items={items} />);
    assertStringIncludes(html, "Dashboard");
    assertStringIncludes(html, "Posts");
  });

  it("should render item hrefs", () => {
    const html = renderToString(<SidebarNav items={items} />);
    assertStringIncludes(html, 'href="/admin"');
    assertStringIncludes(html, 'href="/admin/plugins/post-plugin"');
  });

  it("should apply active classes to active item", () => {
    const html = renderToString(<SidebarNav items={items} />);
    assertStringIncludes(html, "bg-gray-50");
    assertStringIncludes(html, "text-indigo-600");
  });

  it("should render aria-current=page for active item", () => {
    const html = renderToString(<SidebarNav items={items} />);
    assertStringIncludes(html, 'aria-current="page"');
  });

  it("should not render aria-current for inactive items", () => {
    const inactiveItems = [
      {
        label: "Posts",
        href: "/admin/plugins/posts",
        icon: <span>P</span>,
        active: false,
      },
    ];
    const html = renderToString(<SidebarNav items={inactiveItems} />);
    assertEquals(html.includes('aria-current="page"'), false);
  });
});

// --- LoginForm ---
describe("LoginForm component", () => {
  it("should render a standalone HTML page with lang=en", () => {
    const html = renderToString(<LoginForm />);
    assertStringIncludes(html, 'lang="en"');
  });

  it("should render meta charset", () => {
    const html = renderToString(<LoginForm />);
    assertStringIncludes(html, "charSet");
  });

  it("should render title", () => {
    const html = renderToString(<LoginForm />);
    assertStringIncludes(html, "Login");
  });

  it("should render form with POST method to /admin/login", () => {
    const html = renderToString(<LoginForm />);
    assertStringIncludes(html, 'method="POST"');
    assertStringIncludes(html, 'action="/admin/login"');
  });

  it("should render username and password fields", () => {
    const html = renderToString(<LoginForm />);
    assertStringIncludes(html, 'name="username"');
    assertStringIncludes(html, 'name="password"');
  });

  it("should render error Alert when error prop is provided", () => {
    const html = renderToString(<LoginForm error="Invalid credentials" />);
    assertStringIncludes(html, "Invalid credentials");
    assertStringIncludes(html, 'role="alert"');
  });

  it("should not render error Alert when no error prop", () => {
    const html = renderToString(<LoginForm />);
    // With no error, no role=alert should appear from the Alert component
    // (the Alert component adds role="alert")
    assertEquals(html.includes('role="alert"'), false);
  });
});

// --- CrudList ---
describe("CrudList component", () => {
  const columns: DataTableColumn[] = [
    { key: "name", label: "Name" },
    { key: "slug", label: "Slug" },
  ];

  it("should render breadcrumb with plugin name", () => {
    const html = renderToString(
      <CrudList
        pluginName="Categories"
        pluginSlug="category-plugin"
        columns={columns}
        rows={[]}
        total={0}
        page={1}
        totalPages={0}
      />,
    );
    assertStringIncludes(html, "Categories");
  });

  it("should render DataTable", () => {
    const html = renderToString(
      <CrudList
        pluginName="Categories"
        pluginSlug="category-plugin"
        columns={columns}
        rows={[{ id: "1", name: "Tech", slug: "tech" }]}
        total={1}
        page={1}
        totalPages={1}
      />,
    );
    assertStringIncludes(html, "Tech");
  });

  it("should render success Alert when success prop is provided", () => {
    const html = renderToString(
      <CrudList
        pluginName="Categories"
        pluginSlug="category-plugin"
        columns={columns}
        rows={[]}
        total={0}
        page={1}
        totalPages={0}
        success="created"
      />,
    );
    assertStringIncludes(html, "created successfully");
  });

  it("should render error Alert when error prop is provided", () => {
    const html = renderToString(
      <CrudList
        pluginName="Categories"
        pluginSlug="category-plugin"
        columns={columns}
        rows={[]}
        total={0}
        page={1}
        totalPages={0}
        error="Something went wrong"
      />,
    );
    assertStringIncludes(html, "Something went wrong");
  });

  it("should render Pagination when totalPages > 1", () => {
    const html = renderToString(
      <CrudList
        pluginName="Categories"
        pluginSlug="category-plugin"
        columns={columns}
        rows={[]}
        total={50}
        page={1}
        totalPages={3}
      />,
    );
    assertStringIncludes(html, "Pagination");
  });

  it("should not render Pagination when totalPages <= 1", () => {
    const html = renderToString(
      <CrudList
        pluginName="Categories"
        pluginSlug="category-plugin"
        columns={columns}
        rows={[]}
        total={5}
        page={1}
        totalPages={1}
      />,
    );
    assertEquals(html.includes('aria-label="Pagination"'), false);
  });
});

// --- CrudForm ---
describe("CrudForm component", () => {
  const fields = [
    { name: "name", label: "Name", type: "text" as const },
    { name: "slug", label: "Slug", type: "text" as const },
  ];

  it("should render breadcrumb with plugin name", () => {
    const html = renderToString(
      <CrudForm
        pluginName="Categories"
        pluginSlug="category-plugin"
        fields={fields}
        action="/admin/plugins/category-plugin"
      />,
    );
    assertStringIncludes(html, "Categories");
  });

  it("should render form with POST method", () => {
    const html = renderToString(
      <CrudForm
        pluginName="Categories"
        pluginSlug="category-plugin"
        fields={fields}
        action="/admin/plugins/category-plugin"
      />,
    );
    assertStringIncludes(html, 'method="POST"');
  });

  it("should render form fields", () => {
    const html = renderToString(
      <CrudForm
        pluginName="Categories"
        pluginSlug="category-plugin"
        fields={fields}
        action="/admin/plugins/category-plugin"
      />,
    );
    assertStringIncludes(html, 'name="name"');
    assertStringIncludes(html, 'name="slug"');
  });

  it("should render hidden _csrf input when csrfToken provided", () => {
    const html = renderToString(
      <CrudForm
        pluginName="Categories"
        pluginSlug="category-plugin"
        fields={fields}
        action="/admin/plugins/category-plugin"
        csrfToken="my-csrf-token"
      />,
    );
    assertStringIncludes(html, 'name="_csrf"');
    assertStringIncludes(html, 'value="my-csrf-token"');
  });

  it("should render Create button when isEdit is false", () => {
    const html = renderToString(
      <CrudForm
        pluginName="Categories"
        pluginSlug="category-plugin"
        fields={fields}
        action="/admin/plugins/category-plugin"
        isEdit={false}
      />,
    );
    assertStringIncludes(html, "Create");
  });

  it("should render Save button when isEdit is true", () => {
    const html = renderToString(
      <CrudForm
        pluginName="Categories"
        pluginSlug="category-plugin"
        fields={fields}
        action="/admin/plugins/category-plugin"
        isEdit
        itemId="123"
      />,
    );
    assertStringIncludes(html, "Save");
  });

  it("should render Cancel link to base path", () => {
    const html = renderToString(
      <CrudForm
        pluginName="Categories"
        pluginSlug="category-plugin"
        fields={fields}
        action="/admin/plugins/category-plugin"
      />,
    );
    assertStringIncludes(html, 'href="/admin/plugins/category-plugin"');
    assertStringIncludes(html, "Cancel");
  });

  it("should render error Alert when errors object is not empty", () => {
    const html = renderToString(
      <CrudForm
        pluginName="Categories"
        pluginSlug="category-plugin"
        fields={fields}
        action="/admin/plugins/category-plugin"
        errors={{ name: "Required" }}
      />,
    );
    assertStringIncludes(html, "Please fix the errors");
  });

  it("should render field values from values prop", () => {
    const html = renderToString(
      <CrudForm
        pluginName="Categories"
        pluginSlug="category-plugin"
        fields={fields}
        action="/admin/plugins/category-plugin"
        values={{ name: "Technology", slug: "technology" }}
      />,
    );
    assertStringIncludes(html, "Technology");
  });
});
