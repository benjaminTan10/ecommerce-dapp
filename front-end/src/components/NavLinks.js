import { Navbar, Container, Nav, NavDropdown } from "react-bootstrap"
import 'bootstrap/dist/css/bootstrap.css';
import Account from "./Account"
import logo from '../dapp-logo.png';

function NavLinks() {

    return (
        <>
            <Navbar bg="dark" variant="dark" expand="lg">
                <Container>
                    <Navbar.Brand href="/">
                        <img src={logo} width="100px" />
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="navbarScroll" />
                    <Navbar.Collapse id="navbarScroll">
                        <Nav activeKey={window.location.pathname}
                            className="me-auto"
                            style={{ maxHeight: '100px' }}
                            navbarScroll>
                            <Nav.Link href="/">Home</Nav.Link>
                            <Nav.Link href="/my-products">My Products</Nav.Link>
                            <Nav.Link href="/my-store">Store</Nav.Link>
                            <NavDropdown
                                id="nav-dropdown-dark-example"
                                title="Add"
                                menuVariant="dark"
                            >
                                <NavDropdown.Item href="/add-product">Product</NavDropdown.Item>
                                <NavDropdown.Item href="/create-auction">Auction</NavDropdown.Item>
                            </NavDropdown>
                        </Nav>
                        <Account />
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        </>
    );
}

export default NavLinks;