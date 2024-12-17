import express from "express";
import bodyParser from "body-parser";
import { Contact, migrate } from "./contacts_model.js";

const app = express();

migrate();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.redirect("/contacts");
});

app.get("/contacts", async (req, res) => {
  let search = req.query.q;
  let page = parseInt(req.query.page || 1);
  let contacts_set;
  if (search) {
    contacts_set = await Contact.search(search);
    if (req.headers["hx-trigger"] === "search") {
      return res.render("rows", { contacts: contacts_set });
    }
  } else {
    contacts_set = await Contact.all(page);
  }
  res.render("index", {
    contacts: contacts_set,
    // archiver: Contact.Archiver.get(),
  });
});

app.post("/contacts/archive", (req, res) => {
  let archiver = Contact.Archiver.get();
  archiver.run();
  res.render("archive_ui", { archiver: archiver });
});

app.get("/contacts/archive", (req, res) => {
  let archiver = Contact.Archiver.get();
  res.render("archive_ui", { archiver: archiver });
});

app.get("/contacts/archive/file", (req, res) => {
  let archiver = Contact.Archiver.get();
  res.download(archiver.archive_file(), "archive.json");
});

app.delete("/contacts/archive", (req, res) => {
  let archiver = Contact.Archiver.get();
  archiver.reset();
  res.render("archive_ui", { archiver: archiver });
});

app.get("/contacts/count", async (req, res) => {
  let count = await Contact.count();
  res.send(`(${count} total Contacts)`);
});

app.get("/contacts/new", (req, res) => {
  res.render("new", { contact: new Contact() });
});

app.post("/contacts/new", async (req, res) => {
  let c = new Contact(
    null,
    req.body.first_name,
    req.body.last_name,
    req.body.phone,
    req.body.email
  );
  if (await c.save()) {
    req.flash("info", "Created New Contact!");
    res.redirect("/contacts");
  } else {
    res.render("new", { contact: c });
  }
});

app.get("/contacts/:contact_id", async (req, res) => {
  let contact = await Contact.find(req.params.contact_id);
  res.render("show", { contact: contact });
});

app.get("/contacts/:contact_id/edit", async (req, res) => {
  let contact = await Contact.find(req.params.contact_id);
  res.render("edit", { contact: contact });
});

app.post("/contacts/:contact_id/edit", async (req, res) => {
  let c = await Contact.find(req.params.contact_id);
  c.update(
    req.body.first_name,
    req.body.last_name,
    req.body.phone,
    req.body.email
  );
  if (await c.save()) {
    req.flash("info", "Updated Contact!");
    res.redirect(`/contacts/${req.params.contact_id}`);
  } else {
    res.render("edit", { contact: c });
  }
});

app.delete("/contacts/:contact_id", async (req, res) => {
  let contact = await Contact.find(req.params.contact_id);
  await contact.delete();
  if (req.headers["hx-trigger"] === "delete-btn") {
    req.flash("info", "Deleted Contact!");
    res.redirect("/contacts", 303);
  } else {
    res.send("");
  }
});

app.delete("/contacts/", async (req, res) => {
  let contact_ids = req.body.selected_contact_ids.map(Number);
  for (let contact_id of contact_ids) {
    let contact = await Contact.find(contact_id);
    await contact.delete();
  }
  req.flash("info", "Deleted Contacts!");
  let contacts_set = await Contact.all(1);
  res.render("index", { contacts: contacts_set });
});

app.get("/api/v1/contacts", async (req, res) => {
  let contacts_set = await Contact.all();
  res.json({ contacts: contacts_set });
});

app.post("/api/v1/contacts", async (req, res) => {
  let c = new Contact(
    null,
    req.body.first_name,
    req.body.last_name,
    req.body.phone,
    req.body.email
  );
  if (await c.save()) {
    res.json(c);
  } else {
    res.status(400).json({ errors: c.errors });
  }
});

app.get("/api/v1/contacts/:contact_id", async (req, res) => {
  let contact = await Contact.find(req.params.contact_id);
  res.json(contact);
});

app.put("/api/v1/contacts/:contact_id", async (req, res) => {
  let c = await Contact.find(req.params.contact_id);
  c.update(
    req.body.first_name,
    req.body.last_name,
    req.body.phone,
    req.body.email
  );
  if (await c.save()) {
    res.json(c);
  } else {
    res.status(400).json({ errors: c.errors });
  }
});

app.delete("/api/v1/contacts/:contact_id", async (req, res) => {
  let contact = await Contact.find(req.params.contact_id);
  await contact.delete();
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
