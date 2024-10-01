package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
)

const (
	ORG_ID     = "org-ii0hnFOsRe7LA9WZIh6qfXmS"
	PROJECT_ID = "proj_WyD7Ti008fMTnMBg2heMRYqq"
)

type ServiceAccount struct {
	Id     string `json:"id"`
	Object string `json:"object"`
	Secret []struct {
		SensitiveID string `json:"sensitive_id"`
		CreatedAt   int    `json:"created"`
	} `json:"secret"`
}

func (r ServiceAccount) openApiKey() string {
	return r.Secret[0].SensitiveID
}

func (r ServiceAccount) createdAt() int {
	return r.Secret[0].CreatedAt
}

func (r ServiceAccount) redactedApiKey() string {
	token := r.openApiKey()
	visibleStart := token[:8]
	visibleEnd := token[len(token)-4:]
	redactedPart := strings.Repeat("*", len(token)-12)

	return visibleStart + redactedPart + visibleEnd
}

type Name struct {
	Name               string
	LastName           string
	Email              string
	ServiceAccountName string
	KeyName            string
}

func NewName(email string) Name {
	if strings.Contains(email, "@sportalliance.com") {
		log.Fatalln("The email address should be a Sport Alliance email address", email)
	}
	segments, ok := strings.CutSuffix(email, "@sportalliance.com")
	if !ok {
		log.Fatalln("The email address should be a valid Sport Alliance email address", segments)
	}

	nameSegments := strings.Split(segments, ".")
	if len(nameSegments) != 2 {
		log.Fatalln("The email address should be a valid Sport Alliance email address")
	}

	return Name{
		Name:               nameSegments[0],
		LastName:           nameSegments[1],
		Email:              email,
		ServiceAccountName: "chatpad-" + nameSegments[0] + "-" + nameSegments[1],
		KeyName:            "chatpad " + nameSegments[0] + "." + nameSegments[1],
	}
}

func main() {
	email := flag.String("email", "", "the API key name")
	bearerToken := flag.String("token", "", "the bearer token, has to be a browser session token")
	flag.Parse()
	if *email == "" || *bearerToken == "" {
		log.Fatalln("Usage: --name <apikey_name> --token <bearer_token>")
	}
	if (*bearerToken)[0:5] != "sess-" {
		log.Fatalln("The bearer has to be a browser session token. It should start with 'sses-'")
	}

	checkCommand("op", "1Password CLI (op) could not be found. Please install it before running this script.")
	name := NewName(*email)

	log.Println("Signing in to 1Password...")
	signInTo1Password()
	log.Println("Signed in to 1Password successfully.")

	log.Println("Generating API key...")
	serviceAcc := createOpenAiServiceAccount(name, *bearerToken)
	log.Println("API key generated successfully.")

	log.Println("Adding API key to 1Password...")
	addTo1Password(name, serviceAcc)
	log.Println("API key added to 1Password successfully.")

	log.Println("Sharing 1Password item...")
	share1PasswordItem(name)

	log.Println("Modifying API key...")
	modifyAPIKey(*bearerToken, name, serviceAcc)
	log.Println("API key modified successfully.")
}

func checkCommand(cmdName, errMsg string) {
	if _, err := exec.LookPath(cmdName); err != nil {
		log.Fatalln(errMsg)
	}
}

func signInTo1Password() {
	cmd := exec.Command("op", "signin", "--raw")
	err := cmd.Run()
	if err != nil {
		log.Fatalln(err)
	}
}

func createOpenAiServiceAccount(name Name, bearerToken string) ServiceAccount {
	var response ServiceAccount
	reqBody := fmt.Sprintf(`{"id":"%s"}`, name.ServiceAccountName)
	req, _ := http.NewRequest("POST", "https://api.openai.com/v1/dashboard/service_accounts", bytes.NewBuffer([]byte(reqBody)))
	setHeaders(req, bearerToken, len(reqBody))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalln("Error creating OpenAI service account", err)
	}
	defer resp.Body.Close()

	err = json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		body, _ := io.ReadAll(resp.Body)
		log.Fatalln("Error decoding service account creation response:", err, "\nBody:", string(body))
	}

	log.Printf("Created %+v\n", response)
	if len(response.Secret) == 0 {
		log.Fatalln("Error creating OpenAI service account: no key was created")
	}
	return response
}

func setHeaders(req *http.Request, bearerToken string, contentLength int) {
	headers := map[string]string{
		"Authorization":       "Bearer " + bearerToken,
		"Accept":              "*/*",
		"Content-Type":        "application/json",
		"OpenAI-Organization": ORG_ID,
		"OpenAI-Project":      PROJECT_ID,
		"Host":                "api.openai.com",
		"User-Agent":          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:128.0) Gecko/20100101 Firefox/128.0",
		"Accept-Language":     "en-US,en;q=0.7,de-DE;q=0.3",
		"Referer":             "https://platform.openai.com/",
		"Content-Length":      strconv.Itoa(contentLength),
		"Origin":              "https://platform.openai.com",
		"Connection":          "keep-alive",
		"Sec-Fetch-Dest":      "empty",
		"Sec-Fetch-Mode":      "cors",
		"Sec-Fetch-Site":      "same-site",
		"Priority":            "u=0",
		"Pragma":              "no-cache",
		"Cache-Control":       "no-cache",
		"TE":                  "trailers",
	}
	for key, value := range headers {
		req.Header.Set(key, value)
	}
}

func addTo1Password(name Name, serviceAcc ServiceAccount) {
	token := serviceAcc.openApiKey()
	apiKeyName := name.ServiceAccountName
	cmd := exec.Command("op", "item", "create",
		"--category=login",
		"--title="+apiKeyName+" API Key",
		"--vault=OpenAI API Keys",
		"--url=https://api.openai.com",
		"--tags=API,OpenAI",
		"username="+apiKeyName,
		"password="+token)
	err := cmd.Run()
	if err != nil {
		log.Fatalln("Failed adding key to 1PW", err)
	}
}

func share1PasswordItem(name Name) {
	cmd := exec.Command("op", "item", "share",
		name.ServiceAccountName+" API Key",
		"--vault=OpenAI API Keys",
		"--emails="+name.Email,
	)
	out, err := cmd.Output()
	if err != nil {
		log.Fatalln("Error sharing 1PW link", err)
	}

	log.Println("1Password Share Link:\n", string(out))
}

func modifyAPIKey(bearerToken string, modifiedName Name, serviceAcc ServiceAccount) {
	createdAt := serviceAcc.createdAt()
	redactedApiKey := serviceAcc.redactedApiKey()

	reqBody := fmt.Sprintf(
		`{"action":"update","redacted_key":"%s","created_at":%d,"name":"%s","scopes":["model.read","api.model.read","model.request","api.model.request"]}`,
		redactedApiKey,
		createdAt,
		modifiedName.KeyName,
	)
	req, _ := http.NewRequest("POST", "https://api.openai.com/dashboard/organizations/"+ORG_ID+"/projects/"+PROJECT_ID+"/api_keys", bytes.NewBuffer([]byte(reqBody)))
	setHeaders(req, bearerToken, len(reqBody))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalln("Failed to modify the OpenAI API key", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Fatalln("Failed to modify the OpenAI API key", err, string(body))
	}
}
